const Visit = require('./models/Visit');
const Student = require('./models/Student');
const { sendVisitReminderWhatsApp } = require('./utils/whatsappService');
const mongoose = require('mongoose');

// MongoDB connection handler for Lambda
let cachedDb = null;

const connectDB = async () => {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  const mongoURI = process.env.MONGODB_URI;
  
  if (!mongoURI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

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
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 5,
      minPoolSize: 1,
    });

    cachedDb = mongoose.connection;
    console.log('✅ MongoDB connected successfully (Cron Lambda)');
    return cachedDb;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    throw err;
  }
};

const getVisitDateTime = (visitDate, visitTime) => {
  const [hours, minutes] = visitTime.split(':').map(Number);
  const date = new Date(visitDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const check24HourReminders = async () => {
  try {
    await connectDB();
    
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in24Hours15Min = new Date(in24Hours.getTime() + 15 * 60 * 1000);

    const visits = await Visit.find({
      visitDate: { $gte: now, $lte: in24Hours15Min },
      notified24h: false,
    }).populate('studentId');

    for (const visit of visits) {
      if (!visit.visitTime || !visit.studentId) continue;

      const visitDateTime = getVisitDateTime(visit.visitDate, visit.visitTime);
      const timeDiff = visitDateTime.getTime() - now.getTime();
      const hoursUntilVisit = timeDiff / (1000 * 60 * 60);

      if (hoursUntilVisit >= 23.5 && hoursUntilVisit <= 24.5) {
        const student = await Student.findById(visit.studentId._id || visit.studentId);
        if (student && student.contactNumber) {
          try {
            await sendVisitReminderWhatsApp(
              student.contactNumber,
              student.name,
              visit.visitDate,
              visit.visitTime,
              '24h'
            );
            visit.notified24h = true;
            await visit.save();
            console.log(`✅ 24h reminder sent to ${student.name}`);
          } catch (error) {
            console.error(`❌ Failed to send 24h reminder to ${student.name}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking 24h reminders:', error);
  }
};

const check6HourReminders = async () => {
  try {
    await connectDB();
    
    const now = new Date();
    const in6Hours = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const in6Hours15Min = new Date(in6Hours.getTime() + 15 * 60 * 1000);

    const visits = await Visit.find({
      visitDate: { $gte: now, $lte: in6Hours15Min },
      notified6h: false,
    }).populate('studentId');

    for (const visit of visits) {
      if (!visit.visitTime || !visit.studentId) continue;

      const visitDateTime = getVisitDateTime(visit.visitDate, visit.visitTime);
      const timeDiff = visitDateTime.getTime() - now.getTime();
      const hoursUntilVisit = timeDiff / (1000 * 60 * 60);

      if (hoursUntilVisit >= 5.5 && hoursUntilVisit <= 6.5) {
        const student = await Student.findById(visit.studentId._id || visit.studentId);
        if (student && student.contactNumber) {
          try {
            await sendVisitReminderWhatsApp(
              student.contactNumber,
              student.name,
              visit.visitDate,
              visit.visitTime,
              '6h'
            );
            visit.notified6h = true;
            await visit.save();
            console.log(`✅ 6h reminder sent to ${student.name}`);
          } catch (error) {
            console.error(`❌ Failed to send 6h reminder to ${student.name}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking 6h reminders:', error);
  }
};

module.exports.visitNotificationHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
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

    console.log('🔔 Checking visit reminders...');
    await check24HourReminders();
    await check6HourReminders();
    console.log('✅ Visit reminder check completed');

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Visit reminders checked successfully' }),
    };
  } catch (error) {
    console.error('❌ Error in visit notification handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

