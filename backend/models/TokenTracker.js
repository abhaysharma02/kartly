const mongoose = require('mongoose');

const tokenTrackerSchema = new mongoose.Schema({
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true
    },
    date: {
        type: String, // Format: YYYY-MM-DD (local to vendor timezone ideally, we'll use UTC for simplicity)
        required: true
    },
    lastToken: {
        type: Number,
        default: 0
    }
});

tokenTrackerSchema.index({ vendorId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('TokenTracker', tokenTrackerSchema);
