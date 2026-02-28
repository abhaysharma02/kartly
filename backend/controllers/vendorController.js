const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Subscription = require('../models/Subscription');
const Order = require('../models/Order');

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
