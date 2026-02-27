const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true,
        index: true
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String },
    amount: { type: Number, required: true },
    status: {
        type: String,
        enum: ['CREATED', 'SUCCESS', 'FAILED'],
        default: 'CREATED',
        index: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
