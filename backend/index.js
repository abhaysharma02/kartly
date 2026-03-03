require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');

const startCronJobs = require('./utils/cronJobs');
const authRoutes = require('./routes/authRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? ['https://kartly.nestely.in', 'https://pos.nestely.in']
            : '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
});

// Store io in app for access inside controllers
app.set('io', io);

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://kartly.nestely.in', 'https://pos.nestely.in']
        : '*'
}));
app.use(express.json());
app.use(morgan('dev'));

// Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB Atlas');
        // Start Cron Jobs after DB connection
        startCronJobs();
    })
    .catch(err => console.error('MongoDB connection error:', err));

// Socket.io Setup
io.on('connection', (socket) => {
    console.log('A client connected:', socket.id);

    socket.on('join_room', (data) => {
        // In production, verify JWT or token here before joining
        if (data && data.vendorId) {
            const room = `vendor_${data.vendorId}`;
            socket.join(room);
            console.log(`Socket ${socket.id} joined room ${room}`);
        }
    });

    socket.on('join_order_room', (data) => {
        if (data && data.orderId) {
            const room = `order_${data.orderId}`;
            socket.join(room);
            console.log(`Socket ${socket.id} joined room ${room}`);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });

    socket.on('ORDER_ACK', async (data) => {
        if (data && data.orderId) {
            console.log(`[Socket] Kitchen Acknowledged Order: ${data.orderId}`);
            try {
                const Order = require('./models/Order');
                await Order.findByIdAndUpdate(data.orderId, { acknowledged: true });
            } catch (err) {
                console.error('[Socket] Failed to process ORDER_ACK', err);
            }
        }
    });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Kartly API is running' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
