const mongoose = require('mongoose');

const webhookLogSchema = new mongoose.Schema({
    eventId: { type: String, required: true },
    eventData: { type: mongoose.Schema.Types.Mixed },
    status: { type: String, enum: ['Processing', 'Success', 'Failed'], default: 'Processing' },
    error: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('WebhookLog', webhookLogSchema);
