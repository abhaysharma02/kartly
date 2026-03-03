const InventoryItem = require('../models/InventoryItem');

// @desc    Get all inventory items for vendor
// @route   GET /api/vendor/inventory
// @access  Private (Vendor Owner/Manager)
const getInventoryItems = async (req, res) => {
    try {
        const items = await InventoryItem.find({ vendorId: req.vendorId });
        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ error: 'Server Error fetching inventory items' });
    }
};

// @desc    Add a new inventory item
// @route   POST /api/vendor/inventory
// @access  Private
const createInventoryItem = async (req, res) => {
    try {
        const { itemName, quantity, unit, unitPrice, lowStockThreshold } = req.body;

        if (!itemName || quantity === undefined || unitPrice === undefined) {
            return res.status(400).json({ error: 'Item name, quantity, and unit price are required.' });
        }

        const newItem = new InventoryItem({
            vendorId: req.vendorId,
            itemName,
            quantity: Number(quantity),
            unit,
            unitPrice: Number(unitPrice),
            lowStockThreshold: Number(lowStockThreshold) || 10
        });

        await newItem.save();
        res.status(201).json(newItem);
    } catch (error) {
        console.error('Create Inventory Error:', error);
        res.status(500).json({ error: 'Server Error creating inventory item', details: error.message });
    }
};

// @desc    Update an inventory item (used for updating stock when things finish)
// @route   PUT /api/vendor/inventory/:id
// @access  Private
const updateInventoryItem = async (req, res) => {
    try {
        const { itemName, quantity, unit, unitPrice, lowStockThreshold } = req.body;

        const item = await InventoryItem.findOne({ _id: req.params.id, vendorId: req.vendorId });

        if (!item) {
            return res.status(404).json({ error: 'Inventory item not found' });
        }

        if (itemName) item.itemName = itemName;
        if (quantity !== undefined) item.quantity = Number(quantity);
        if (unit) item.unit = unit;
        if (unitPrice !== undefined) item.unitPrice = Number(unitPrice);
        if (lowStockThreshold !== undefined) item.lowStockThreshold = Number(lowStockThreshold);

        await item.save(); // pre-save hook will recalculate totalValue
        res.status(200).json(item);
    } catch (error) {
        res.status(500).json({ error: 'Server Error updating inventory item' });
    }
};

// @desc    Delete an inventory item
// @route   DELETE /api/vendor/inventory/:id
// @access  Private
const deleteInventoryItem = async (req, res) => {
    try {
        const item = await InventoryItem.findOneAndDelete({ _id: req.params.id, vendorId: req.vendorId });

        if (!item) {
            return res.status(404).json({ error: 'Inventory item not found' });
        }

        res.status(200).json({ message: 'Inventory item removed successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server Error deleting inventory item' });
    }
};

// @desc    Deduct stock when an order is successful
const deductStock = async (vendorId, items) => {
    try {
        for (const item of items) {
            // Find inventory item by exact name match for MVP simple correlation
            const inventoryItem = await InventoryItem.findOne({ vendorId: vendorId, itemName: item.name });
            if (inventoryItem) {
                // Deduct quantity
                const newQuantity = Math.max(0, inventoryItem.quantity - item.quantity);
                inventoryItem.quantity = newQuantity;
                await inventoryItem.save();
            }
        }
    } catch (err) {
        console.error('Failed to deduct stock:', err);
    }
};

// @desc    Revert stock if an order is cancelled
const revertStock = async (vendorId, items) => {
    try {
        for (const item of items) {
            const inventoryItem = await InventoryItem.findOne({ vendorId: vendorId, itemName: item.name });
            if (inventoryItem) {
                inventoryItem.quantity = inventoryItem.quantity + item.quantity;
                await inventoryItem.save();
            }
        }
    } catch (err) {
        console.error('Failed to revert stock:', err);
    }
};

module.exports = {
    getInventoryItems,
    createInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    deductStock,
    revertStock
};
