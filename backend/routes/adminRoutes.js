const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Simple Admin Auth Middleware (Placeholder)
const adminAuth = (req, res, next) => {
    const secret = req.headers['x-admin-secret'];
    if (secret !== process.env.ADMIN_SECRET) {
        // In development fallback to allow if not strictly configured
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ error: 'Admin access denied.' });
        }
    }
    next();
};

router.use(adminAuth);

router.get('/analytics', adminController.getSaaSAnalytics);
router.put('/vendor/:id/toggle-status', adminController.toggleVendorStatus);

module.exports = router;
