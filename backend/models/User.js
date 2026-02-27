const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['OWNER', 'STAFF'], required: true }
});

userSchema.index({ vendorId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
