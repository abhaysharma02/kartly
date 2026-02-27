const Category = require('../models/Category');

exports.createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        const vendorId = req.vendorId; // Attached by auth middleware

        const category = new Category({ vendorId, name });
        await category.save();

        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ error: 'Server error creating category' });
    }
};

exports.getCategories = async (req, res) => {
    try {
        const vendorId = req.vendorId; // Or req.params.vendorId for public view
        const targetVendorId = vendorId || req.params.vendorId;

        if (!targetVendorId) {
            return res.status(400).json({ error: 'Vendor ID required' });
        }

        const categories = await Category.find({ vendorId: targetVendorId, isActive: true });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching categories' });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, isActive } = req.body;
        const vendorId = req.vendorId;

        // The core of multi-tenant isolation! We must query by BOTH _id and vendorId
        const category = await Category.findOneAndUpdate(
            { _id: id, vendorId },
            { name, isActive },
            { new: true }
        );

        if (!category) return res.status(404).json({ error: 'Category not found or unauthorized' });

        res.json(category);
    } catch (error) {
        res.status(500).json({ error: 'Server error updating category' });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const vendorId = req.vendorId;

        const category = await Category.findOneAndDelete({ _id: id, vendorId });
        if (!category) return res.status(404).json({ error: 'Category not found or unauthorized' });

        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Server error deleting category' });
    }
};
