const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Subscription = require('../models/Subscription');

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
        // Usually, you might return the domain + vendorId so the frontend can draw it
        const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/q/${vendorId}`;

        res.json({
            success: true,
            qrUrl,
            message: 'QR code URL generated successfully. Use frontend qrcode library to render.'
        });

    } catch (error) {
        res.status(500).json({ error: 'Server error generating QR code' });
    }
};
