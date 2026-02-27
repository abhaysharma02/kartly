const cron = require('node-cron');
const Subscription = require('../models/Subscription');

const startCronJobs = () => {
    // Run every day at midnight (0 0 * * *)
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
};

module.exports = startCronJobs;
