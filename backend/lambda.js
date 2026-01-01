const serverless = require('serverless-http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// CORS middleware - MUST be first to ensure headers are set on all responses
app.use((req, res, next) => {
  // Set CORS headers for all responses
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Additional CORS middleware for compatibility
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize DB connection on cold start (before routes)
let dbInitialized = false;
let dbInitPromise = null;

const initializeDB = async () => {
  // If already initialized and connected, return immediately
  if (dbInitialized && mongoose.connection.readyState === 1) {
    return;
  }
  
  // If initialization is already in progress, wait for it
  if (dbInitPromise) {
    return dbInitPromise;
  }
  
  // Start initialization
  dbInitPromise = (async () => {
    try {
      await connectDB();
      dbInitialized = true;
      
      // Initialize WhatsApp service if configured
      if (process.env.WHATSAPP_ENABLED === 'true' && process.env.WHATSAPP_FROM_NUMBER) {
        const { initializeWhatsApp } = require('./utils/whatsappService');
        initializeWhatsApp({
          provider: process.env.WHATSAPP_PROVIDER || 'twilio',
          accountSid: process.env.TWILIO_ACCOUNT_SID,
          authToken: process.env.TWILIO_AUTH_TOKEN,
          fromNumber: process.env.WHATSAPP_FROM_NUMBER,
        });
      }
    } catch (err) {
      console.error('Failed to initialize database:', err);
      dbInitPromise = null; // Reset so we can retry
      throw err;
    }
  })();
  
  return dbInitPromise;
};

// Middleware to ensure DB is connected before routes execute
app.use(async (req, res, next) => {
  // Skip DB check for health endpoint
  if (req.path === '/api/health') {
    return next();
  }
  
  try {
    await initializeDB();
    // Verify connection is ready
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database connection not ready',
        state: mongoose.connection.readyState 
      });
    }
    next();
  } catch (err) {
    console.error('DB middleware error:', err.message);
    return res.status(503).json({ 
      error: 'Database connection failed',
      message: err.message 
    });
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/tests', require('./routes/tests'));
app.use('/api/results', require('./routes/results'));
app.use('/api/visits', require('./routes/visits'));
app.use('/api/backlog', require('./routes/backlog'));
app.use('/api/syllabus', require('./routes/syllabus'));
app.use('/api/topics', require('./routes/topics'));
app.use('/api/student-topic-status', require('./routes/studentTopicStatus'));
app.use('/api/whatsapp', require('./routes/whatsapp'));

// Health check (non-blocking)
app.get('/api/health', async (req, res) => {
  // Try to initialize DB if not already done (non-blocking)
  if (!dbInitialized) {
    initializeDB().catch(err => {
      console.error('Health check: DB init failed (non-critical):', err.message);
    });
  }
  
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    database: dbStatus,
    environment: 'lambda',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware - ensure CORS headers are set on error responses
app.use((err, req, res, next) => {
  // Set CORS headers even on errors
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler - ensure CORS headers are set
app.use((req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.status(404).json({ error: 'Route not found' });
});

// MongoDB connection handler for Lambda
let cachedDb = null;

const connectDB = async () => {
  // Return cached connection if available
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  // Hardcoded MongoDB URI as fallback
  const HARDCODED_MONGODB_URI = 'mongodb+srv://studentsdata27_db_user:y3EkRkypFjeguZvM@student-dashboard.t0omzpb.mongodb.net/jee-dashboard?appName=Student-Dashboard';
  
  let mongoURI = process.env.MONGODB_URI || HARDCODED_MONGODB_URI;
  
  if (!mongoURI) {
    console.error('❌ MONGODB_URI environment variable is not set, using hardcoded fallback');
    mongoURI = HARDCODED_MONGODB_URI;
  }

  // Validate connection string format
  const trimmedURI = mongoURI.trim();
  if (!trimmedURI.startsWith('mongodb://') && !trimmedURI.startsWith('mongodb+srv://')) {
    console.error('❌ Invalid MongoDB URI format, using hardcoded fallback');
    console.error('URI length:', trimmedURI.length);
    console.error('URI starts with:', trimmedURI.substring(0, 20));
    // Use hardcoded URI as fallback
    mongoURI = HARDCODED_MONGODB_URI;
  }
  
  // Re-trim after potential fallback
  const finalURI = mongoURI.trim();

  // Ensure database name is in the connection string for Atlas
  let connectionString = finalURI;
  if (finalURI.includes('mongodb+srv://')) {
    const dbMatch = finalURI.match(/mongodb\+srv:\/\/[^@]+@[^\/]+\/([^?]+)/);
    if (!dbMatch) {
      connectionString = finalURI.replace(/\?/, '/jee-dashboard?').replace(/\/$/, '/jee-dashboard');
      if (!connectionString.includes('/jee-dashboard')) {
        connectionString = finalURI.endsWith('/') 
          ? finalURI + 'jee-dashboard' 
          : finalURI + '/jee-dashboard';
      }
    }
  } else if (finalURI.includes('mongodb://')) {
    // Handle regular mongodb:// connection strings
    const dbMatch = finalURI.match(/mongodb:\/\/[^\/]+\/([^?]+)/);
    if (!dbMatch) {
      connectionString = finalURI.replace(/\?/, '/jee-dashboard?').replace(/\/$/, '/jee-dashboard');
      if (!connectionString.includes('/jee-dashboard')) {
        connectionString = finalURI.endsWith('/') 
          ? finalURI + 'jee-dashboard' 
          : finalURI + '/jee-dashboard';
      }
    }
  }

  try {
    // Close existing connection if any
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 5,
      minPoolSize: 1,
      connectTimeoutMS: 10000,
      bufferCommands: false, // Disable mongoose buffering - fail fast if not connected
    });

    cachedDb = mongoose.connection;
    console.log('✅ MongoDB connected successfully (Lambda)');
    return cachedDb;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    throw err;
  }
};

// Lambda handler
module.exports.handler = serverless(app, {
  binary: ['image/*', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
});

