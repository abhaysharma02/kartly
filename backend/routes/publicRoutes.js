const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { requireActiveSubscription } = require('../middleware/subscription');

// Public endpoints (Accessed by customer via QR code)

// 1. Get vendor menu (public)
const { getCategories } = require('../controllers/categoryController');
const { getMenuItems } = require('../controllers/menuController');

// We use the same controllers but without auth middleware! They read from req.params
router.get('/:vendorId/categories', getCategories);
router.get('/:vendorId/menu-items', getMenuItems);

// 2. Place an order (Requires active subscription check first)
router.post('/:vendorId/order', requireActiveSubscription, orderController.createOrder);

// 3. Razorpay Webhook (Sever-to-server)
router.post('/webhook/razorpay', orderController.razorpayWebhook);

// 4. Get order details for receipt
router.get('/orders/:orderId', orderController.getOrderById);

module.exports = router;
