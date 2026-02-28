const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    menuItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem',
        required: true
    },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true,
        index: true
    },
    tokenNumber: { type: Number, required: true },
    customerPhone: { type: String, required: false },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true },
    taxAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    paymentStatus: {
        type: String,
        enum: ['INITIATED', 'SUCCESS', 'FAILED'],
        default: 'INITIATED',
        index: true
    },
    orderStatus: {
        type: String,
        enum: ['Pending', 'Preparing', 'Ready', 'Completed'],
        default: 'Pending'
    }
}, { timestamps: true });

orderSchema.index({ createdAt: 1 });

module.exports = mongoose.model('Order', orderSchema);
