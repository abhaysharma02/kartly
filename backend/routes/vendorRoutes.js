const express = require('express');
const router = express.Router();
const { isolateTenant } = require('../middleware/auth');
const categoryController = require('../controllers/categoryController');
const menuController = require('../controllers/menuController');
const vendorController = require('../controllers/vendorController');

// All vendor dashboard routes require authentication
router.use(isolateTenant);

// Categories
router.post('/categories', categoryController.createCategory);
router.get('/categories', categoryController.getCategories); // Also available publicly but useful for dashboard
router.put('/categories/:id', categoryController.updateCategory);
router.delete('/categories/:id', categoryController.deleteCategory);

// Menu Items
router.post('/menu-items', menuController.createMenuItem);
router.get('/menu-items', menuController.getMenuItems);
router.put('/menu-items/:id', menuController.updateMenuItem);

// QR Generation Check
router.get('/qr', vendorController.generateQR);

// Orders
router.put('/orders/:orderId/status', vendorController.updateOrderStatus);

module.exports = router;
