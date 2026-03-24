const twilio = require('twilio');

// Configuration should ideally be in process.env
const accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC_dummy_fallback_sid_for_development';
const authToken = process.env.TWILIO_AUTH_TOKEN || 'dummy_fallback_token';
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Twilio sandbox number

let client;
try {
    // Only initialize if we have real-looking credentials, otherwise let it silently mock
    if (accountSid.startsWith('AC')) {
        client = twilio(accountSid, authToken);
    }
} catch (error) {
    console.error('Twilio initialization failed:', error);
}

/**
 * Sends a WhatsApp message to a specific number
 * @param {string} to - The recipient's phone number
 * @param {string} message - The message content
 */
const sendWhatsAppMessage = async (to, message) => {
    try {
        if (!client) {
            console.log(`[WhatsApp Mock] To: ${to} | Message: ${message}`);
            return true;
        }

        // Ensure the number is formatted correctly with the whatsapp: prefix
        const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:+91${to.replace(/\D/g, '')}`;

        await client.messages.create({
            body: message,
            from: twilioNumber,
            to: formattedTo
        });
        
        console.log(`[WhatsApp Success] Message sent to ${formattedTo}`);
        return true;
    } catch (error) {
        console.error(`[WhatsApp Error] Failed to send to ${to}:`, error.message);
        // We do not throw the error to ensure the calling flow (e.g. order creation) doesn't fail
        return false;
    }
};

module.exports = {
    sendWhatsAppMessage
};
