const serverless = require('serverless-http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware - CORS
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Health check
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    database: dbStatus,
    environment: 'lambda'
  });
});

// MongoDB connection handler for Lambda
let cachedDb = null;

const connectDB = async () => {
  // Return cached connection if available
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  const mongoURI = process.env.MONGODB_URI;
  
  if (!mongoURI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  // Ensure database name is in the connection string for Atlas
  let connectionString = mongoURI;
  if (mongoURI.includes('mongodb+srv://')) {
    const dbMatch = mongoURI.match(/mongodb\+srv:\/\/[^@]+@[^\/]+\/([^?]+)/);
    if (!dbMatch) {
      connectionString = mongoURI.replace(/\?/, '/jee-dashboard?').replace(/\/$/, '/jee-dashboard');
      if (!connectionString.includes('/jee-dashboard')) {
        connectionString = mongoURI.endsWith('/') 
          ? mongoURI + 'jee-dashboard' 
          : mongoURI + '/jee-dashboard';
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
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2,  // Maintain at least 2 socket connections
    });

    cachedDb = mongoose.connection;
    console.log('✅ MongoDB connected successfully (Lambda)');
    return cachedDb;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    throw err;
  }
};

// Initialize DB connection on cold start
let dbInitialized = false;

const initializeDB = async () => {
  if (!dbInitialized) {
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
      // Don't throw - let Lambda handle it
    }
  }
};

// Lambda handler
module.exports.handler = serverless(app, {
  binary: ['image/*', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  request: async (request, event, context) => {
    // Initialize DB on first request (cold start)
    await initializeDB();
    return request;
  },
});

