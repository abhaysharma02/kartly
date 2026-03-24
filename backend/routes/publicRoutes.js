const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { requireActiveSubscription } = require('../middleware/subscription');

// Public endpoints (Accessed by customer via QR code)

// 1. Get vendor menu (public)
const { getCategories } = require('../controllers/categoryController');
const { getMenuItems } = require('../controllers/menuController');

// We use the same controllers but without auth middleware! They read from req.params
router.get('/:vendorId/categories', requireActiveSubscription, getCategories);
router.get('/:vendorId/menu-items', requireActiveSubscription, getMenuItems);
router.get('/:vendorId/info', require('../controllers/vendorController').getPublicVendorInfo);

router.get('/store/:vendorId/tables', async (req, res) => {
    try {
        const Vendor = require('../models/Vendor');
        const vendor = await Vendor.findById(req.params.vendorId).select('tables');
        if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
        res.json({ success: true, tableList: vendor.tables || [] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch tables' });
    }
});

// 2. Place an order (Requires active subscription check first)
router.post('/:vendorId/order', requireActiveSubscription, orderController.createOrder);

// 3. Razorpay Webhook (Sever-to-server)
router.post('/webhook/razorpay', orderController.razorpayWebhook);

// 3.5 Demo Webhook (Bypass Razorpay for immediate success)
router.post('/:vendorId/order/verify-demo', orderController.verifyDemoPayment);

// 4. Get order details for receipt
router.get('/orders/:orderId', orderController.getOrderById);

// 5. Download Invoice PDF
const invoiceController = require('../controllers/invoiceController');
router.get('/orders/:orderId/invoice', invoiceController.generateInvoice);

module.exports = router;
