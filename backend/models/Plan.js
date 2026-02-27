const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
    name: { type: String, enum: ['TRIAL', 'BASIC', 'PREMIUM'], required: true },
    price: { type: Number, required: true },
    durationDays: { type: Number, required: true },
    orderLimit: { type: Number },
    features: { type: Object }
});

module.exports = mongoose.model('Plan', planSchema);
