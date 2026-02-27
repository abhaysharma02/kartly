const Subscription = require('../models/Subscription');

const requireActiveSubscription = async (req, res, next) => {
    try {
        const vendorId = req.vendorId || req.params.vendorId || req.body.vendorId;

        if (!vendorId) {
            return res.status(400).json({ error: 'Vendor ID is required to check subscription.' });
        }

        const activeSub = await Subscription.findOne({
            vendorId: vendorId,
            status: { $in: ['ACTIVE', 'TRIAL'] }
        });

        if (!activeSub) {
            return res.status(403).json({
                error: 'Subscription Inactive',
                message: 'This vendor does not have an active subscription.'
            });
        }

        if (new Date(activeSub.endDate) < new Date()) {
            // It's technically expired, though the cron job might not have run yet.
            return res.status(403).json({
                error: 'Subscription Expired',
                message: 'This vendor\'s subscription has expired.'
            });
        }

        next();
    } catch (error) {
        console.error('Subscription check error:', error);
        res.status(500).json({ error: 'Internal server error during subscription check' });
    }
};

module.exports = { requireActiveSubscription };
