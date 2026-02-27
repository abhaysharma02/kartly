const jwt = require('jsonwebtoken');

const isolateTenant = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // The payload must contain the vendorId
        if (!decoded.vendorId) {
            return res.status(403).json({ error: 'Invalid token structure. Vendor context missing.' });
        }

        // Attach vendorId to the request object for downstream use in Mongoose queries
        req.vendorId = decoded.vendorId;

        // Also attach the full user info if needed
        req.user = decoded;

        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
};

module.exports = { isolateTenant };
