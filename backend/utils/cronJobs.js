const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const Order = require('../models/Order');

const startCronJobs = () => {
    // 1. Run every day at midnight (0 0 * * *) for Subscriptions
    cron.schedule('0 0 * * *', async () => {
        console.log('Running daily subscription expiry check...');
        try {
            const result = await Subscription.updateMany(
                {
                    endDate: { $lt: new Date() },
                    status: { $in: ['ACTIVE', 'TRIAL'] }
                },
                { $set: { status: 'EXPIRED' } }
            );

            console.log(`Subscription expiry check complete. Modified ${result.modifiedCount} records.`);
        } catch (error) {
            console.error('Error in subscription expiry cron job:', error);
        }
    });

    // 2. Run every 5 minutes to check for unacknowledged real-time orders (ORDER_ACK fallback)
    cron.schedule('*/5 * * * *', async () => {
        console.log('Running order acknowledgement fallback check...');
        try {
            // Find orders created more than 5 minutes ago that are paid but not acknowledged
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

            const result = await Order.updateMany(
                {
                    paymentStatus: 'SUCCESS',
                    acknowledged: false,
                    failedTimeout: false,
                    createdAt: { $lt: fiveMinutesAgo }
                },
                { $set: { failedTimeout: true } }
            );

            if (result.modifiedCount > 0) {
                console.log(`[Socket Fallback] Flagged ${result.modifiedCount} orders that missed Kitchen ACK timeout.`);
            }
        } catch (error) {
            console.error('Error in order ACK fallback cron job:', error);
        }
    });
};

module.exports = startCronJobs;
