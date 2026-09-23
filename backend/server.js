require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const { initSockets } = require('./sockets/socketHandler');

// Routes
const authRoutes = require('./routes/authRoutes');
const requestRoutes = require('./routes/requestRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const donorRoutes = require('./routes/donorRoutes');
const thalassemiaRoutes = require('./routes/thalassemiaRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();
const server = http.createServer(app);

// Connect Database
connectDB();

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});
initSockets(io);

// Security & Global Middleware
app.use(helmet({
  contentSecurityPolicy: false // Disabled for embedded asset rendering in dev
}));
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' }
});
app.use('/api', limiter);

// Serve uploads folder static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    system: 'RaktSaarthi Smart Blood Coordination System API',
    timestamp: new Date()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/thalassemia', thalassemiaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const { autoSyncAndCheckExpiries } = require('./controllers/inventoryController');
const BloodBank = require('./models/BloodBank');

const runPeriodicExpirySync = async () => {
  try {
    const banks = await BloodBank.find({});
    for (const bank of banks) {
      await autoSyncAndCheckExpiries(bank._id);
    }
  } catch (err) {
    console.error('Periodic Expiry Sync Error:', err.message);
  }
};

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`\n🚀 RaktSaarthi API Server running on port ${PORT}`);
  console.log(`📍 Health Check: http://localhost:${PORT}/api/health\n`);

  // Run initial expiry check & setup 30-min background sync
  runPeriodicExpirySync();
  setInterval(runPeriodicExpirySync, 30 * 60 * 1000);
});
