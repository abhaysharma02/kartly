const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Subscription = require('../models/Subscription');
const Order = require('../models/Order');
const Plan = require('../models/Plan');
const Vendor = require('../models/Vendor');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_stub',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_stub',
});

exports.generateQR = async (req, res) => {
    try {
        const vendorId = req.vendorId;

        // 1. Check Subscription
        const activeSub = await Subscription.findOne({
            vendorId,
            status: { $in: ['ACTIVE', 'TRIAL'] }
        });

        if (!activeSub || new Date(activeSub.endDate) < new Date()) {
            return res.status(403).json({ error: 'Active subscription required to generate QR.' });
        }

        // 2. Check Categories minimums (At least 1 category)
        const categoryCount = await Category.countDocuments({ vendorId, isActive: true });
        if (categoryCount === 0) {
            return res.status(400).json({ error: 'Add at least one active category to generate QR.' });
        }

        // 3. Check Menu Items minimums (At least 1 item)
        const itemCount = await MenuItem.countDocuments({ vendorId, isAvailable: true });
        if (itemCount === 0) {
            return res.status(400).json({ error: 'Add at least one available menu item to generate QR.' });
        }

        // Passed all checks. 
        // Return just the routing path, let the frontend construct the full domain URL 
        // to avoid mismatch between localhost, render, vercel, etc.
        const qrPath = `/q/${vendorId}`;

        res.json({
            success: true,
            qrPath,
            message: 'QR code path generated successfully. Use frontend window.location.origin to render.'
        });

    } catch (error) {
        res.status(500).json({ error: 'Server error generating QR code' });
    }
};

exports.getPublicVendorInfo = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const vendor = await Vendor.findById(vendorId).select('name shopName upiId');
        if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
        
        res.json({
            name: vendor.shopName,
            businessName: vendor.name,
            upiId: vendor.upiId || '',
            rating: "4.5", // Static aesthetics for MVP
            time: "20-25 mins",
            type: "Quick Bites"
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching vendor info' });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const vendorId = req.vendorId;
        const { orderId } = req.params;
        const { status } = req.body;

        const validStatuses = ['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid order status' });
        }

        const order = await Order.findOneAndUpdate(
            { _id: orderId, vendorId },
            { orderStatus: status },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const io = req.app.get('io');

        // Trigger Business Logic: Revert Stock on Cancellation
        if (status === 'Cancelled') {
            try {
                const { revertStock } = require('./inventoryController');
                await revertStock(vendorId, order.items, io);
                console.log(`[Inventory] Reverted stock for cancelled Order ${order._id}`);
            } catch (inventoryErr) {
                console.error('[Inventory Error] Failed to revert stock:', inventoryErr);
            }
        }

        // Emit Socket.io event to the customer's room (using order ID as room name for customers)
        if (io) {
            io.to(`order_${order._id.toString()}`).emit('order_status_update', {
                orderId: order._id,
                orderStatus: status
            });
            // We can also emit a general update to the vendor room so other vendor dashboards sync
            io.to(`vendor_${vendorId}`).emit('vendor_orders_refresh');
        }

        res.json({ success: true, order });

    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ error: 'Server error updating order status' });
    }
};

exports.getCustomers = async (req, res) => {
    try {
        const vendorId = req.vendorId;

        // Aggregate unique customer phones who have successfully paid
        const customers = await Order.aggregate([
            { $match: { vendorId: vendorId, paymentStatus: 'SUCCESS', customerPhone: { $exists: true, $ne: null, $ne: "" } } },
            {
                $group: {
                    _id: "$customerPhone",
                    totalOrders: { $sum: 1 },
                    totalSpent: { $sum: "$totalAmount" },
                    lastOrderDate: { $max: "$createdAt" }
                }
            },
            { $sort: { lastOrderDate: -1 } }
        ]);

        res.json({ success: true, customers });
    } catch (error) {
        console.error('Fetch customers error:', error);
        res.status(500).json({ error: 'Server error fetching customers' });
    }
};

exports.getOrders = async (req, res) => {
    try {
        const vendorId = req.vendorId;
        // Fetch orders that are not Completed or Cancelled yet (i.e., active queue)
        // Or fetch today's orders. For standard dashboard, let's fetch active + today's history
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const orders = await Order.find({
            vendorId,
            paymentStatus: { $in: ['SUCCESS', 'PAID', 'CASH_PENDING'] },
            $or: [
                { orderStatus: { $in: ['Pending', 'Preparing', 'Ready'] } },
                { createdAt: { $gte: startOfDay } }
            ]
        }).sort({ createdAt: -1 });

        res.json({ success: true, orders });
    } catch (error) {
        console.error('Fetch orders error:', error);
        res.status(500).json({ error: 'Server error fetching orders' });
    }
};

exports.getSubscription = async (req, res) => {
    try {
        const vendorId = req.vendorId;
        const subscription = await Subscription.findOne({ vendorId }).populate('planId');

        const Vendor = require('../models/Vendor');
        const vendor = await Vendor.findById(vendorId);
        
        const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
        const msSinceCreation = new Date() - new Date(vendor.createdAt);
        const trialDaysLeft = Math.max(0, Math.ceil((fourteenDaysMs - msSinceCreation) / (1000 * 60 * 60 * 24)));
        const isTrial = msSinceCreation < fourteenDaysMs;

        res.json({ success: true, subscription, trialDaysLeft, isTrial });
    } catch (error) {
        console.error('Fetch subscription error:', error);
        res.status(500).json({ error: 'Server error fetching subscription' });
    }
};

exports.renewSubscription = async (req, res) => {
    try {
        const vendorId = req.vendorId;

        let premiumPlan = await Plan.findOne({ name: 'PREMIUM' });
        if (!premiumPlan) {
            premiumPlan = await Plan.create({
                name: 'PREMIUM',
                price: 999,
                durationDays: 30,
                orderLimit: 999999,
                features: { support: 'priority', qrcode: true, analytics: true }
            });
        }

        const rpOptions = {
            amount: Math.round(premiumPlan.price * 100), // in paise
            currency: "INR",
            receipt: `vendor_upgrade_${vendorId.toString().substring(0, 10)}`
        };

        const rpOrder = await razorpay.orders.create(rpOptions);

        // CREATE PAYMENT RECORD FOR WEBHOOK TO FIND (No orderId needed)
        const Payment = require('../models/Payment');
        await Payment.create({
            vendorId,
            razorpayOrderId: rpOrder.id,
            amount: premiumPlan.price,
            status: 'CREATED'
        });

        res.json({
            success: true,
            razorpayOrderId: rpOrder.id,
            amount: rpOptions.amount,
            planInfo: premiumPlan
        });

    } catch (error) {
        console.error('Renew subscription error:', error);
        res.status(500).json({ error: 'Failed to initiate subscription renewal' });
    }
};

exports.getSettings = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.vendorId).select('name shopName email phone upiId status completedOnboarding vendorWhatsApp whatsappEnabled');
        res.json({ success: true, settings: vendor });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Server error fetching settings' });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const { shopName, name, upiId, tables, vendorWhatsApp, whatsappEnabled } = req.body;
        const updateFields = { shopName, name, upiId };
        if (tables !== undefined) updateFields.tables = tables;
        if (vendorWhatsApp !== undefined) updateFields.vendorWhatsApp = vendorWhatsApp;
        if (whatsappEnabled !== undefined) updateFields.whatsappEnabled = whatsappEnabled;

        const vendor = await Vendor.findByIdAndUpdate(
            req.vendorId,
            { $set: updateFields },
            { new: true, runValidators: true }
        ).select('name shopName email phone upiId status tables vendorWhatsApp whatsappEnabled');
        
        res.json({ success: true, settings: vendor });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Server error updating settings' });
    }
};

exports.completeOnboarding = async (req, res) => {
    try {
        const vendor = await Vendor.findByIdAndUpdate(
            req.vendorId,
            { $set: { completedOnboarding: true } },
            { new: true }
        );
        res.json({ success: true, completedOnboarding: vendor.completedOnboarding });
    } catch (error) {
        console.error('Complete onboarding error:', error);
        res.status(500).json({ error: 'Server error completing onboarding' });
    }
};

exports.testWhatsApp = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.vendorId);
        if (!vendor || !vendor.vendorWhatsApp) {
            return res.status(400).json({ error: 'Please save a valid WhatsApp number first.' });
        }

        const { sendWhatsAppMessage } = require('../utils/whatsapp');
        const success = await sendWhatsAppMessage(
            vendor.vendorWhatsApp, 
            `🔔 Test Message from Kartly! If you can read this, your WhatsApp integrations are fully hooked up.`
        );

        if (success) {
            res.json({ success: true, message: 'Test message triggered successfully.' });
        } else {
            res.status(500).json({ error: 'Failed to send WhatsApp message. Check logs.' });
        }
    } catch (error) {
        console.error('WhatsApp Test error:', error);
        res.status(500).json({ error: 'Server error testing WhatsApp' });
    }
};

exports.patchTables = async (req, res) => {
    try {
        const { tables } = req.body;
        const vendor = await Vendor.findByIdAndUpdate(
            req.vendorId,
            { $set: { tables } },
            { new: true, runValidators: true }
        ).select('tables');
        
        res.json({ success: true, tables: vendor.tables });
    } catch (error) {
        console.error('Patch tables error:', error);
        res.status(500).json({ error: 'Server error updating tables configuration' });
    }
};

exports.getDailyReport = async (req, res) => {
    try {
        const { date } = req.query; // YYYY-MM-DD
        const targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(targetDate);
        nextDate.setDate(targetDate.getDate() + 1);

        const Order = require('../models/Order');
        
        // Find orders for the vendor on that date, excluding Cancelled
        const orders = await Order.find({
            vendorId: req.vendorId,
            createdAt: { $gte: targetDate, $lt: nextDate },
            orderStatus: { $ne: 'Cancelled' }
        }).populate('items.menuItemId');

        let totalRevenue = 0;
        let totalOrders = orders.length;
        let byPaymentMethod = { upi: 0, cash: 0 };
        const hourlyMap = {};
        const itemMap = {};

        orders.forEach(order => {
            totalRevenue += order.totalAmount;
            
            // Payment method split (UPI includes scan_qr historically)
            if (order.paymentMethod === 'CASH') byPaymentMethod.cash++;
            else byPaymentMethod.upi++;

            // Hourly breakdown
            const hour = new Date(order.createdAt).getHours();
            if (!hourlyMap[hour]) hourlyMap[hour] = { hour, revenue: 0, orders: 0 };
            hourlyMap[hour].revenue += order.totalAmount;
            hourlyMap[hour].orders += 1;

            // Item frequency
            order.items.forEach(item => {
                if (!itemMap[item.name]) itemMap[item.name] = { name: item.name, qty: 0, revenue: 0 };
                itemMap[item.name].qty += item.quantity;
                itemMap[item.name].revenue += item.totalPrice;
            });
        });

        const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;
        
        const byHour = Object.values(hourlyMap).sort((a, b) => a.hour - b.hour);
        const topItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

        res.json({
            success: true,
            report: {
                totalRevenue,
                totalOrders,
                avgOrderValue,
                byPaymentMethod,
                byHour,
                topItems
            }
        });

    } catch (error) {
        console.error('Daily Report generation error:', error);
        res.status(500).json({ error: 'Server error generating daily report' });
    }
};
