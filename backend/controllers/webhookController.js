const crypto = require('crypto');
const WebhookLog = require('../models/WebhookLog');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');

exports.razorpayWebhook = async (req, res) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'secret_stub';
        
        // 1. Verify Signature using raw body
        const signature = req.headers['x-razorpay-signature'];
        const expectedSignature = crypto.createHmac('sha256', secret)
                                        .update(req.body.toString())
                                        .digest('hex');
                                        
        if (expectedSignature !== signature) {
            console.error("Webhook signature mismatch.");
            return res.status(400).send('Invalid signature');
        }

        // 2. Parse body now since it's verified
        const event = JSON.parse(req.body.toString());

        // 3. Log event unconditionally
        await WebhookLog.create({
            eventId: event.account_id || event.id || `evt_${Date.now()}`,
            eventData: event,
            status: 'Processing'
        });

        const rpOrderId = event.payload?.payment?.entity?.order_id;

        // 4. Handle Specific Events
        if (event.event === 'payment.captured') {
            if (rpOrderId) {
                const payment = await Payment.findOne({ razorpayOrderId: rpOrderId });
                if (payment) {
                    payment.status = 'SUCCESS';
                    await payment.save();

                    // Upgrade Subscription!
                    const now = new Date();
                    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                    
                    await Subscription.findOneAndUpdate(
                        { vendorId: payment.vendorId },
                        {
                            status: 'ACTIVE',
                            activatedAt: now,
                            endDate: nextMonth,
                            planId: (await require('../models/Plan').findOne({ name: 'PREMIUM' }))._id
                        },
                        { upsert: true }
                    );
                }
            }
        } else if (event.event === 'payment.failed' || event.event === 'subscription.cancelled') {
            if (rpOrderId) {
                const payment = await Payment.findOne({ razorpayOrderId: rpOrderId });
                if (payment) {
                    payment.status = 'FAILED';
                    await payment.save();

                    await Subscription.findOneAndUpdate(
                        { vendorId: payment.vendorId },
                        { status: 'INACTIVE' }
                    );
                }
            }
        }

        res.status(200).send('OK');

    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).send('Webhook Processing Error');
    }
};
