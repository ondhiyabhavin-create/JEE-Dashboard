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
  // If already connected, return immediately
  if (mongoose.connection.readyState === 1) {
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
      dbInitialized = false;
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
    // Initialize DB - simple and reliable
    await initializeDB();
    
    // Simple check - if not connected, return error
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database connection not ready',
        message: 'Please try again in a moment'
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
app.use('/api/question-records', require('./routes/questionRecords'));
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

// MongoDB connection handler for Lambda - SIMPLIFIED for reliability
let connectionPromise = null;

const connectDB = async () => {
  // If already connected, return immediately
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If connection is in progress, wait for it
  if (connectionPromise) {
    return connectionPromise;
  }

  // Hardcoded MongoDB URI as fallback
  const HARDCODED_MONGODB_URI = 'mongodb+srv://studentsdata27_db_user:y3EkRkypFjeguZvM@student-dashboard.t0omzpb.mongodb.net/jee-dashboard?appName=Student-Dashboard';
  
  let mongoURI = process.env.MONGODB_URI || HARDCODED_MONGODB_URI;
  
  if (!mongoURI) {
    mongoURI = HARDCODED_MONGODB_URI;
  }

  // Validate and prepare connection string
  const trimmedURI = mongoURI.trim();
  if (!trimmedURI.startsWith('mongodb://') && !trimmedURI.startsWith('mongodb+srv://')) {
    mongoURI = HARDCODED_MONGODB_URI;
  }
  
  let connectionString = mongoURI.trim();
  
  // Ensure database name is in connection string
  if (connectionString.includes('mongodb+srv://')) {
    const dbMatch = connectionString.match(/mongodb\+srv:\/\/[^@]+@[^\/]+\/([^?]+)/);
    if (!dbMatch) {
      if (connectionString.endsWith('/')) {
        connectionString = connectionString + 'jee-dashboard';
      } else {
        connectionString = connectionString + '/jee-dashboard';
      }
    }
  }

  // Start connection
  connectionPromise = (async () => {
    try {
      // Close existing connection if disconnected
      if (mongoose.connection.readyState === 3) {
        try {
          await mongoose.connection.close();
        } catch (e) {
          // Ignore close errors
        }
      }

      await mongoose.connect(connectionString, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 1,
        connectTimeoutMS: 15000,
        maxIdleTimeMS: 300000, // 5 minutes
      });

      console.log('✅ MongoDB connected successfully');
      return mongoose.connection;
    } catch (err) {
      console.error('❌ MongoDB connection failed:', err.message);
      connectionPromise = null; // Reset so we can retry
      throw err;
    }
  })();

  return connectionPromise;
};

// Lambda handler
module.exports.handler = serverless(app, {
  binary: ['image/*', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
});

