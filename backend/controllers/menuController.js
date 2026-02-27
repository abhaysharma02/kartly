const MenuItem = require('../models/MenuItem');

exports.createMenuItem = async (req, res) => {
    try {
        const { categoryId, name, description, price, imageUrl } = req.body;
        const vendorId = req.vendorId;

        const item = new MenuItem({
            vendorId,
            categoryId,
            name,
            description,
            price,
            imageUrl
        });

        await item.save();
        res.status(201).json(item);
    } catch (error) {
        res.status(500).json({ error: 'Server error creating menu item' });
    }
};

exports.getMenuItems = async (req, res) => {
    try {
        const targetVendorId = req.vendorId || req.params.vendorId;

        if (!targetVendorId) {
            return res.status(400).json({ error: 'Vendor ID required' });
        }

        const items = await MenuItem.find({ vendorId: targetVendorId, isAvailable: true });
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching menu items' });
    }
};

exports.updateMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, imageUrl, isAvailable, categoryId } = req.body;
        const vendorId = req.vendorId;

        const item = await MenuItem.findOneAndUpdate(
            { _id: id, vendorId }, // Multi-tenant scoping
            { name, description, price, imageUrl, isAvailable, categoryId },
            { new: true }
        );

        if (!item) return res.status(404).json({ error: 'Item not found or unauthorized' });

        res.json(item);
    } catch (error) {
        res.status(500).json({ error: 'Server error updating menu item' });
    }
};
