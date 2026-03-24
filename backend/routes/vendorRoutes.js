const express = require('express');
const router = express.Router();
const { isolateTenant } = require('../middleware/auth');
const categoryController = require('../controllers/categoryController');
const menuController = require('../controllers/menuController');
const vendorController = require('../controllers/vendorController');
const inventoryController = require('../controllers/inventoryController');

// All vendor dashboard routes require authentication
// All vendor dashboard routes require authentication
router.use(isolateTenant);

const { requireActiveSubscription } = require('../middleware/subscription');

// Categories
router.post('/categories', requireActiveSubscription, categoryController.createCategory);
router.get('/categories', requireActiveSubscription, categoryController.getCategories); // Also available publicly but useful for dashboard
router.put('/categories/:id', requireActiveSubscription, categoryController.updateCategory);
router.delete('/categories/:id', requireActiveSubscription, categoryController.deleteCategory);

// Menu Items
router.post('/menu-items', requireActiveSubscription, menuController.createMenuItem);
router.get('/menu-items', requireActiveSubscription, menuController.getMenuItems);
router.put('/menu-items/:id', requireActiveSubscription, menuController.updateMenuItem);
router.delete('/menu-items/:id', requireActiveSubscription, menuController.deleteMenuItem);
const { itemImageUpload } = require('../utils/uploadMiddleware');
router.post('/menu-items/:itemId/image', requireActiveSubscription, itemImageUpload.single('image'), menuController.uploadItemImage);

// QR Generation Check
router.get('/qr', vendorController.generateQR);

// Orders
router.get('/orders', requireActiveSubscription, vendorController.getOrders);
router.put('/orders/:orderId/status', requireActiveSubscription, vendorController.updateOrderStatus);
const orderController = require('../controllers/orderController');
router.get('/orders/:orderId/kot', requireActiveSubscription, orderController.getKOT);

// CRM (Customers)
router.get('/customers', requireActiveSubscription, vendorController.getCustomers);

// Billing & Subscriptions
router.get('/subscription', vendorController.getSubscription);
router.post('/subscription/renew', vendorController.renewSubscription);

// Inventory
router.get('/inventory', requireActiveSubscription, inventoryController.getInventoryItems);
router.post('/inventory', requireActiveSubscription, inventoryController.createInventoryItem);
router.put('/inventory/:id', requireActiveSubscription, inventoryController.updateInventoryItem);
router.delete('/inventory/:id', requireActiveSubscription, inventoryController.deleteInventoryItem);

// Settings
router.get('/settings', vendorController.getSettings);
router.put('/settings', vendorController.updateSettings);
router.patch('/settings/tables', vendorController.patchTables);
router.post('/settings/whatsapp-test', vendorController.testWhatsApp);
router.patch('/onboarding-complete', vendorController.completeOnboarding);

// Reports
router.get('/reports/daily', requireActiveSubscription, vendorController.getDailyReport);

module.exports = router;
