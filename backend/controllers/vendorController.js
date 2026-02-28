const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Subscription = require('../models/Subscription');
const Order = require('../models/Order');
const Plan = require('../models/Plan');
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

exports.updateOrderStatus = async (req, res) => {
    try {
        const vendorId = req.vendorId;
        const { orderId } = req.params;
        const { status } = req.body;

        const validStatuses = ['Pending', 'Preparing', 'Ready', 'Completed'];
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

        // Emit Socket.io event to the customer's room (using order ID as room name for customers)
        const io = req.app.get('io');
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

exports.getSubscription = async (req, res) => {
    try {
        const vendorId = req.vendorId;
        const subscription = await Subscription.findOne({ vendorId }).populate('planId');

        res.json({ success: true, subscription });
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
