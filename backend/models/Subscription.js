const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true,
        index: true
    },
    planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan',
        required: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true, index: true },
    status: {
        type: String,
        enum: ['TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED'],
        default: 'TRIAL'
    },
    paymentReference: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
