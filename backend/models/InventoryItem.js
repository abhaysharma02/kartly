const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true,
        index: true
    },
    itemName: {
        type: String,
        required: true,
        trim: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 0
    },
    unit: {
        type: String,
        required: true,
        enum: ['kg', 'liters', 'pieces', 'packets', 'grams', 'other'],
        default: 'pieces'
    },
    unitPrice: {
        type: Number,
        required: true,
        default: 0
    },
    totalValue: {
        type: Number,
        default: 0
    },
    lowStockThreshold: {
        type: Number,
        default: 10
    }
}, { timestamps: true });

// Pre-save hook to calculate totalValue automatically
inventoryItemSchema.pre('save', function (next) {
    this.totalValue = this.quantity * this.unitPrice;
    next();
});

const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);

module.exports = InventoryItem;
