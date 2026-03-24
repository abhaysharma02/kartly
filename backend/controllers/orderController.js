const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const TokenTracker = require('../models/TokenTracker');
const Vendor = require('../models/Vendor');
const MenuItem = require('../models/MenuItem');
const { deductStock } = require('./inventoryController');
// Note: io is imported dynamically in index.js, we will pass it via req.app.get('io')

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_stub',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_stub',
});

exports.createOrder = async (req, res) => {
    try {
        const { vendorId } = req.params; // From the public URL /q/:vendorId/order
        const { items, customerPhone, paymentMethod = 'ONLINE' } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        // 0. Server-Side Cart Validation (SECURITY)
        const vendorRecord = await Vendor.findById(vendorId);
        let calculatedSubtotal = 0;
        const verifiedItems = [];

        for (const item of items) {
            const menuItem = await MenuItem.findOne({ _id: item.menuItemId, vendorId, isAvailable: true });
            if (!menuItem) {
                return res.status(400).json({ error: `Item ${item.name || 'unknown'} is currently unavailable or invalid.` });
            }

            const unitPrice = menuItem.price;
            const totalPrice = unitPrice * item.quantity;
            calculatedSubtotal += totalPrice;

            verifiedItems.push({
                menuItemId: menuItem._id,
                name: menuItem.name,
                quantity: item.quantity,
                unitPrice: unitPrice,
                totalPrice: totalPrice,
                inventoryItemId: menuItem.inventoryItemId
            });
        }

        const calculatedTax = calculatedSubtotal * 0.05; // Fixed 5% GST for MVP
        const calculatedTotal = calculatedSubtotal + calculatedTax;

        // 1. Generate Token Number (Daily Reset System)
        // Get current date string in YYYY-MM-DD
        const today = new Date().toISOString().split('T')[0];

        const tokenRecord = await TokenTracker.findOneAndUpdate(
            { vendorId, date: today },
            { $inc: { lastToken: 1 } },
            { new: true, upsert: true }
        );
        const tokenNumber = tokenRecord.lastToken;

        // 2. Create Mongoose Order
        let paymentStatus = 'INITIATED';
        if (paymentMethod === 'CASH') paymentStatus = 'CASH_PENDING';
        if (paymentMethod === 'UPI') paymentStatus = 'PAID'; // Trusted from Vendor UPI Intent button

        const dbOrder = new Order({
            vendorId,
            tokenNumber,
            customerPhone,
            items: verifiedItems,
            subtotal: calculatedSubtotal,
            taxAmount: calculatedTax,
            totalAmount: calculatedTotal,
            paymentMethod: paymentMethod,
            paymentStatus: paymentStatus,
            orderStatus: 'Pending'
        });

        await dbOrder.save();

        const { sendWhatsAppMessage } = require('../utils/whatsapp');
        if (vendorRecord && vendorRecord.whatsappEnabled && vendorRecord.vendorWhatsApp) {
            const itemString = verifiedItems.map(i => `${i.name} x ${i.quantity}`).join(', ');
            const msg = `🔔 New Order #${dbOrder.tokenNumber} | Table ${dbOrder.tableNumber || '-'} | ₹${dbOrder.totalAmount} | [${itemString}]`;
            sendWhatsAppMessage(vendorRecord.vendorWhatsApp, msg);
            
            if (paymentMethod === 'UPI') {
                const confMsg = `✅ Payment confirmed for Order #${dbOrder.tokenNumber} — ₹${dbOrder.totalAmount}`;
                sendWhatsAppMessage(vendorRecord.vendorWhatsApp, confMsg);
            }
        }

        if (paymentMethod === 'CASH' || paymentMethod === 'UPI') {
            // We bypass Razorpay, tell the Kitchen immediately!
            const io = req.app.get('io');
            if (io) {
                await deductStock(vendorId, verifiedItems, io);
                io.to(`vendor_${vendorId}`).emit('new_order', dbOrder);
                io.to(`vendor_${vendorId}`).emit('kot_print', {
                    token: dbOrder.tokenNumber,
                    tableNumber: dbOrder.tableNumber || '-',
                    items: dbOrder.items.map(i => ({ name: i.name, qty: i.quantity, note: '' })),
                    orderTime: dbOrder.createdAt,
                    orderId: dbOrder._id
                });
            }

            return res.json({
                success: true,
                orderId: dbOrder._id,
                paymentMethod: paymentMethod
            });
        }

        // 3. Create Razorpay Order (ONLINE ONLY)
        // Total amount in paise (multiply by 100)
        const rpOptions = {
            amount: Math.round(calculatedTotal * 100),
            currency: "INR",
            receipt: dbOrder._id.toString()
        };

        const rpOrder = await razorpay.orders.create(rpOptions);

        // 4. Create Payment Tracking Record
        const paymentRecord = new Payment({
            vendorId,
            orderId: dbOrder._id,
            razorpayOrderId: rpOrder.id,
            amount: calculatedTotal,
            status: 'CREATED'
        });

        await paymentRecord.save();

        res.json({
            success: true,
            orderId: dbOrder._id,
            razorpayOrderId: rpOrder.id,
            amount: rpOrder.amount,
            currency: rpOrder.currency,
            paymentMethod: 'ONLINE'
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order: ' + (error.message || error.description || error.toString()), stack: error.stack });
    }
};

exports.razorpayWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-razorpay-signature'];
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret_stub';

        // Verify webhook signature
        // IMPORTANT: Express must have raw body parser enabled for webhooks if using crypto directly,
        // or we stringify the JSON body exactly as received.
        const expectedSignature = crypto.createHmac('sha256', secret)
            .update(JSON.stringify(req.body))
            .digest('hex');

        if (expectedSignature !== signature) {
            return res.status(400).json({ error: 'Invalid webhook signature' });
        }

        // signature verified
        const event = req.body.event;

        if (event === 'payment.captured' || event === 'order.paid') {
            const paymentEntity = req.body.payload.payment.entity;
            const rpOrderId = paymentEntity.order_id;
            const rpPaymentId = paymentEntity.id;

            // Find the corresponding Payment and update ONLY if not already SUCCESS
            const paymentRecord = await Payment.findOneAndUpdate(
                { razorpayOrderId: rpOrderId, status: { $ne: 'SUCCESS' } },
                { status: 'SUCCESS', razorpayPaymentId: rpPaymentId },
                { new: true }
            );

            // If paymentRecord is null, it means it was already processed or doesn't exist.
            if (!paymentRecord) {
                return res.json({ status: 'ok', msg: 'Webhook duplicate ignored or payment not found' });
            }

            if (paymentRecord) {
                // If it's a food order payment
                if (paymentRecord.orderId) {
                    const orderRecord = await Order.findOneAndUpdate(
                        { _id: paymentRecord.orderId },
                        { paymentStatus: 'SUCCESS' },
                        { new: true }
                    );

                    if (orderRecord) {
                        const io = req.app.get('io');
                        if (io) {
                            await deductStock(orderRecord.vendorId, orderRecord.items, io);
                            io.to(`vendor_${orderRecord.vendorId}`).emit('new_order', orderRecord);
                            io.to(`vendor_${orderRecord.vendorId}`).emit('kot_print', {
                                token: orderRecord.tokenNumber,
                                tableNumber: orderRecord.tableNumber || '-',
                                items: orderRecord.items.map(i => ({ name: i.name, qty: i.quantity, note: '' })),
                                orderTime: orderRecord.createdAt,
                                orderId: orderRecord._id
                            });
                        }
                        
                        const vendorRecord = await Vendor.findById(orderRecord.vendorId);
                        const { sendWhatsAppMessage } = require('../utils/whatsapp');
                        if (vendorRecord && vendorRecord.whatsappEnabled && vendorRecord.vendorWhatsApp) {
                            const confMsg = `✅ Payment confirmed for Order #${orderRecord.tokenNumber} — ₹${orderRecord.totalAmount}`;
                            sendWhatsAppMessage(vendorRecord.vendorWhatsApp, confMsg);
                        }
                    }
                } else {
                    // It's a Subscription Payment (no orderId attached)
                    const subRecord = await Subscription.findOne({ vendorId: paymentRecord.vendorId });
                    if (subRecord) {
                        subRecord.status = 'ACTIVE';
                        // Add 30 days to expiry
                        const currentEnd = new Date(Math.max(new Date(), new Date(subRecord.endDate)));
                        currentEnd.setDate(currentEnd.getDate() + 30);
                        subRecord.endDate = currentEnd;
                        subRecord.paymentReference = rpPaymentId;
                        await subRecord.save();
                        console.log(`[Subscription Activated] Vendor: ${paymentRecord.vendorId}`);
                    }
                }
            }
        } else if (event === 'payment.failed') {
            const paymentEntity = req.body.payload.payment.entity;
            const rpOrderId = paymentEntity.order_id;
            await Payment.findOneAndUpdate(
                { razorpayOrderId: rpOrderId },
                { status: 'FAILED' }
            );
            // Optional: Update Order paymentStatus to FAILED
        }

        res.status(200).json({ status: 'ok' });

    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};

exports.verifyDemoPayment = async (req, res) => {
    try {
        const { orderId } = req.body;

        const orderRecord = await Order.findOneAndUpdate(
            { _id: orderId },
            { paymentStatus: 'SUCCESS' },
            { new: true }
        );

        if (orderRecord) {
            const io = req.app.get('io');
            if (io) {
                await deductStock(orderRecord.vendorId, orderRecord.items, io);
                io.to(`vendor_${orderRecord.vendorId}`).emit('new_order', orderRecord);
                io.to(`vendor_${orderRecord.vendorId}`).emit('kot_print', {
                    token: orderRecord.tokenNumber,
                    tableNumber: orderRecord.tableNumber || '-',
                    items: orderRecord.items.map(i => ({ name: i.name, qty: i.quantity, note: i.note || '' })),
                    orderTime: orderRecord.createdAt,
                    orderId: orderRecord._id
                });
            }

        }
        res.status(200).json({ status: 'ok', msg: 'Demo payment success simulated' });
    } catch (error) {
        console.error('Demo payment error:', error);
        res.status(500).json({ error: 'Demo payment failed' });
    }
};

exports.getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Fetch just the vendor shopName for the receipt
        const vendor = await Vendor.findById(order.vendorId).select('shopName name');

        res.json({
            success: true,
            order,
            vendor
        });

    } catch (error) {
        console.error('Fetch order error:', error);
        res.status(500).json({ error: 'Failed to fetch order details' });
    }
};

exports.getKOT = async (req, res) => {
    try {
        const order = await Order.findOne({ _id: req.params.orderId, vendorId: req.vendorId });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        
        res.json({
            success: true,
            kot: {
                token: order.tokenNumber,
                tableNumber: order.tableNumber || '-',
                items: order.items.map(i => ({ name: i.name, qty: i.quantity, note: '' })),
                orderTime: order.createdAt,
                orderId: order._id
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching KOT schema' });
    }
};
