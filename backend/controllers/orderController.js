const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const TokenTracker = require('../models/TokenTracker');
const Vendor = require('../models/Vendor');
// Note: io is imported dynamically in index.js, we will pass it via req.app.get('io')

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_stub',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_stub',
});

exports.createOrder = async (req, res) => {
    try {
        const { vendorId } = req.params; // From the public URL /q/:vendorId/order
        const { items, subtotal, taxAmount, totalAmount, customerPhone } = req.body;

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
        const dbOrder = new Order({
            vendorId,
            tokenNumber,
            customerPhone,
            items,
            subtotal,
            taxAmount,
            totalAmount,
            paymentStatus: 'INITIATED',
            orderStatus: 'Pending'
        });

        await dbOrder.save();

        // 3. Create Razorpay Order
        // Total amount in paise (multiply by 100)
        const rpOptions = {
            amount: Math.round(totalAmount * 100),
            currency: "INR",
            receipt: dbOrder._id.toString()
        };

        const rpOrder = await razorpay.orders.create(rpOptions);

        // 4. Create Payment Tracking Record
        const paymentRecord = new Payment({
            vendorId,
            orderId: dbOrder._id,
            razorpayOrderId: rpOrder.id,
            amount: totalAmount,
            status: 'CREATED'
        });

        await paymentRecord.save();

        res.json({
            success: true,
            orderId: dbOrder._id,
            razorpayOrderId: rpOrder.id,
            amount: rpOptions.amount,
            tokenNumber
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order' });
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

            // Find the corresponding Payment and Order
            const paymentRecord = await Payment.findOneAndUpdate(
                { razorpayOrderId: rpOrderId },
                { status: 'SUCCESS', razorpayPaymentId: rpPaymentId },
                { new: true }
            );

            if (paymentRecord) {
                const orderRecord = await Order.findOneAndUpdate(
                    { _id: paymentRecord.orderId },
                    { paymentStatus: 'SUCCESS' },
                    { new: true }
                );

                // Emit Socket.io event to the vendor's room
                const io = req.app.get('io');
                if (io && orderRecord) {
                    io.to(`vendor_${orderRecord.vendorId}`).emit('new_order', orderRecord);
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
