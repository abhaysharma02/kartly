const Subscription = require('../models/Subscription');
const Vendor = require('../models/Vendor');

const requireActiveSubscription = async (req, res, next) => {
    try {
        const vendorId = req.vendorId || req.params.vendorId || req.body.vendorId || req.query.vendorId;

        if (!vendorId) {
            return res.status(400).json({ error: 'Vendor ID is required to check subscription.' });
        }

        const vendor = await Vendor.findById(vendorId);
        if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

        // Calculate if within 14-day trial
        const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
        const isTrial = (new Date() - new Date(vendor.createdAt)) < fourteenDaysMs;

        if (isTrial) {
            req.isTrial = true;
            return next();
        }

        // Must check explicit subscription
        const activeSub = await Subscription.findOne({
            vendorId: vendorId,
            status: 'ACTIVE'
        });

        if (activeSub && new Date(activeSub.endDate) > new Date()) {
            return next();
        }

        return res.status(402).json({
            error: 'subscription_required',
            upgradeUrl: '/dashboard/billing',
            message: 'Store is temporarily unavailable. Subscription Inactive.'
        });

    } catch (error) {
        console.error('Subscription check error:', error);
        res.status(500).json({ error: 'Internal server error during subscription check' });
    }
};

module.exports = { requireActiveSubscription };
