const Vendor = require('../models/Vendor');
const User = require('../models/User');
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

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

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'User with this email does not exist.' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Save to user with 1-hour expiry
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL || 'https://kartly.in'}/vendor/reset-password/${resetToken}`;

        const message = `
            <h2>Password Reset Request</h2>
            <p>You have requested a password reset for your Kartly vendor account.</p>
            <p>Please click the link below to set a new password. This link is valid for 1 hour.</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">Reset Password</a>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">If you did not request this, please ignore this email.</p>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Kartly - Password Reset',
                message
            });

            res.status(200).json({ success: true, message: 'Password reset email sent successfully.' });
        } catch (emailError) {
            console.error('Email send error:', emailError);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();

            return res.status(500).json({ error: 'Email could not be sent. Please check SMTP configuration.' });
        }

    } catch (error) {
        console.error('FORGOT PASSWORD ERROR:', error);
        res.status(500).json({ error: 'Server error generating reset token' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        // Update User
        user.passwordHash = passwordHash;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        // Update matching Vendor (to keep passwords in sync)
        await Vendor.findByIdAndUpdate(user.vendorId, { passwordHash });

        res.json({ message: 'Password has been successfully reset. You can now log in.' });

    } catch (error) {
        console.error('RESET PASSWORD ERROR:', error);
        res.status(500).json({ error: 'Server error resetting password' });
    }
};

module.exports = { register, login, forgotPassword, resetPassword };
