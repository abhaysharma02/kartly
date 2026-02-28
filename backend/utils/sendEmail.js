const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // Determine host and port (defaults to simple Gmail configuration for easy setup)
    const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const port = process.env.EMAIL_PORT || 587;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const from = process.env.EMAIL_FROM || 'Kartly Support <support@kartly.in>';

    // If no credentials are provided, we log a warning but don't crash, 
    // it will just fail to send the email in the controller instead of crashing the app entirely on boot.
    if (!user || !pass) {
        console.warn('WARNING: EMAIL_USER or EMAIL_PASS is not set in environment variables. Emails will fail to send.');
    }

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port == 465, // true for 465, false for other ports
        auth: {
            user,
            pass
        }
    });

    const message = {
        from: from,
        to: options.email,
        subject: options.subject,
        html: options.message
    };

    const info = await transporter.sendMail(message);
    console.log('Message sent: %s', info.messageId);
};

module.exports = sendEmail;
