const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware - CORS disabled (allow all origins)
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
    port: process.env.PORT || 5001
  });
});

// MongoDB connection with retry logic and better error handling
const connectDB = async (retries = 3) => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jee-dashboard';
  
  // Ensure database name is in the connection string for Atlas
  let connectionString = mongoURI;
  if (mongoURI.includes('mongodb+srv://')) {
    // Check if database name exists in connection string
    const dbMatch = mongoURI.match(/mongodb\+srv:\/\/[^@]+@[^\/]+\/([^?]+)/);
    if (!dbMatch) {
      // Add database name if missing
      connectionString = mongoURI.replace(/\?/, '/jee-dashboard?').replace(/\/$/, '/jee-dashboard');
      if (!connectionString.includes('/jee-dashboard')) {
        connectionString = mongoURI.endsWith('/') 
          ? mongoURI + 'jee-dashboard' 
          : mongoURI + '/jee-dashboard';
      }
    }
  }

  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(connectionString, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log('✅ MongoDB connected successfully');
      return;
    } catch (err) {
      if (i === retries - 1) {
        console.error('\n❌ MongoDB connection failed after', retries, 'attempts');
        console.error('Error:', err.message);
        console.log('\n📝 Troubleshooting steps:');
        console.log('1. Verify MongoDB Atlas credentials in .env file');
        console.log('2. Check IP whitelist in MongoDB Atlas (add 0.0.0.0/0 for development)');
        console.log('3. Ensure database user has read/write permissions');
        console.log('4. Verify connection string format:');
        console.log('   mongodb+srv://username:password@cluster.mongodb.net/database-name');
        console.log('\n💡 Current connection string:', connectionString.replace(/:[^:@]+@/, ':****@'));
        console.log('   Server will continue but database operations will fail.\n');
      } else {
        console.log(`⏳ Retrying MongoDB connection (${i + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
};

connectDB().then(() => {
  // Initialize WhatsApp service from environment variables if available
  if (process.env.WHATSAPP_ENABLED === 'true' && process.env.WHATSAPP_FROM_NUMBER) {
    const { initializeWhatsApp } = require('./utils/whatsappService');
    initializeWhatsApp({
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.WHATSAPP_FROM_NUMBER,
      provider: process.env.WHATSAPP_PROVIDER || 'twilio'
    });
  }
  
  // Start visit notification service after DB connection
  const { startVisitNotificationService } = require('./services/visitNotificationService');
  startVisitNotificationService();
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use.`);
    console.log(`\nTo fix this, you can:`);
    console.log(`1. Kill the process using port ${PORT}:`);
    console.log(`   lsof -ti:${PORT} | xargs kill -9`);
    console.log(`\n2. Or use a different port by setting PORT environment variable:`);
    console.log(`   PORT=5001 npm run dev\n`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

