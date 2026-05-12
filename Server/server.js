const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { initPresenceSocket } = require('./realtime/presence');

const app = express();
const server = http.createServer(app);

// Middleware
// CORS Configuration - Allow requests from frontend
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'https://kl-pro.vercel.app',
      'https://kl-pro-client.vercel.app',
      'https://www.klpro.company',
      'https://klpro.company',
      'https://klpro-web.onrender.com',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000'
    ];
    
    // Allow if origin is in list or if no origin (like in mobile apps)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Log blocked origins for debugging
      console.warn('CORS blocked origin:', origin);
      callback(null, true); // Still allow - let app handle errors gracefully
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'https://kl-pro.vercel.app',
      'https://kl-pro-client.vercel.app',
      'https://www.klpro.company',
      'https://klpro.company',
      'https://klpro-web.onrender.com'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
});

initPresenceSocket(io);

// Custom middleware to handle both JSON and FormData
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kl-services', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));
app.use('/api/services', require('./routes/services'));
app.use('/api/professionals', require('./routes/professionals'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/products', require('./routes/products'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/homepage-cards', require('./routes/homepageCards'));

// New Payment & Wallet Routes
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/refund', require('./routes/refund'));
app.use('/api/admin-wallet', require('./routes/admin-wallet'));

// Health Check
app.get('/', (req, res) => {
  res.json({ message: 'KLPro Pvt Ltd API is running' });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// 404 Handler - must be last
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
