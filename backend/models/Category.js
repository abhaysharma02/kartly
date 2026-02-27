const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true,
        index: true
    },
    name: { type: String, required: true },
    isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Category', categorySchema);
