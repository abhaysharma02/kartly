const Vendor = require('../models/Vendor');
const Subscription = require('../models/Subscription');
const Order = require('../models/Order');

// Minimal authentication for Admin routes is typically handled by a separate Admin model and JWT role.
// For this stub, we'll assume a basic secret header or just an open route for demonstration.
// In production, add a robust admin verification middleware.

exports.getSaaSAnalytics = async (req, res) => {
    try {
        const totalVendors = await Vendor.countDocuments();
        const activeVendors = await Vendor.countDocuments({ status: 'ACTIVE' });

        const totalOrders = await Order.countDocuments();
        // Revenue from successfully paid orders
        const successOrders = await Order.find({ paymentStatus: 'SUCCESS' });
        const totalPlatformRevenue = successOrders.reduce((sum, o) => sum + o.totalAmount, 0);

        const subscriptions = await Subscription.find().populate('vendorId', 'name shopName email status');

        // Quick breakdown
        const activeSubs = subscriptions.filter(s => s.status === 'ACTIVE').length;
        const trialSubs = subscriptions.filter(s => s.status === 'TRIAL').length;
        const expiredSubs = subscriptions.filter(s => s.status === 'EXPIRED').length;

        res.json({
            metrics: {
                totalVendors,
                activeVendors,
                totalOrders,
                totalPlatformRevenue: totalPlatformRevenue.toFixed(2),
                activeSubs,
                trialSubs,
                expiredSubs
            },
            subscriptions: subscriptions.map(s => ({
                _id: s._id,
                vendorName: s.vendorId?.name || 'Unknown',
                shopName: s.vendorId?.shopName || 'Unknown',
                status: s.status,
                startDate: s.startDate,
                endDate: s.endDate,
                vendorStatus: s.vendorId?.status
            }))
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching analytics' });
    }
};

exports.toggleVendorStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const vendor = await Vendor.findById(id);
        if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

        vendor.status = vendor.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        await vendor.save();

        res.json({ message: `Vendor ${vendor.name} is now ${vendor.status}`, vendor });
    } catch (error) {
        res.status(500).json({ error: 'Server error updating vendor' });
    }
};
