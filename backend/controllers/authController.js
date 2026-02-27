const Vendor = require('../models/Vendor');
const User = require('../models/User');
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    try {
        const { name, shopName, phone, email, password } = req.body;

        // Check if vendor email exists
        const existingVendor = await Vendor.findOne({ email });
        if (existingVendor) {
            return res.status(400).json({ error: 'Vendor email already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const vendor = new Vendor({
            name,
            shopName,
            phone,
            email,
            passwordHash
        });

        await vendor.save();

        // Create Owner User
        const user = new User({
            vendorId: vendor._id,
            name,
            email,
            passwordHash,
            role: 'OWNER'
        });
        await user.save();

        // Find Trial Plan (if doesn't exist, create a generic one for setup)
        let trialPlan = await Plan.findOne({ name: 'TRIAL' });
        if (!trialPlan) {
            console.log('No TRIAL plan found, creating a default one for the system.');
            trialPlan = new Plan({
                name: 'TRIAL',
                price: 0,
                durationDays: 7,
                orderLimit: 100,
                features: { support: 'basic', qrcode: true }
            });
            await trialPlan.save();
        }

        // Create default Trial Subscription
        const startDate = new Date();
        const endDate = new Date(startDate.getTime());
        endDate.setDate(endDate.getDate() + trialPlan.durationDays);

        const subscription = new Subscription({
            vendorId: vendor._id,
            planId: trialPlan._id,
            startDate,
            endDate,
            status: 'TRIAL'
        });

        await subscription.save();

        const payload = {
            vendorId: vendor._id,
            userId: user._id,
            role: user.role
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.status(201).json({
            message: 'Vendor registered successfully. Trial activated.',
            token,
            vendor: { id: vendor._id, shopName: vendor.shopName, email: vendor.email }
        });

    } catch (error) {
        console.error('REGISTRATION ERROR:', error);
        res.status(500).json({ error: 'Server error during registration', details: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const vendor = await Vendor.findById(user.vendorId);
        if (vendor.status !== 'ACTIVE') {
            return res.status(403).json({ error: 'Vendor account is suspended.' });
        }

        const payload = {
            vendorId: user.vendorId,
            userId: user._id,
            role: user.role
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({
            token,
            user: { id: user._id, name: user.name, role: user.role },
            vendorId: user.vendorId
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during login' });
    }
};

module.exports = { register, login };
