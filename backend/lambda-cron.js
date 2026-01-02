const Visit = require('./models/Visit');
const Student = require('./models/Student');
const User = require('./models/User');
const { sendVisitReminder } = require('./utils/emailService');
const mongoose = require('mongoose');

// Helper to get header name from user (most recently updated)
const getHeaderName = async () => {
  try {
    const user = await User.findOne().select('headerName').sort({ updatedAt: -1 });
    return user?.headerName || 'Spectrum Student Data';
  } catch (error) {
    console.error('Error fetching header name:', error);
    return 'Spectrum Student Data';
  }
};

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
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      maxPoolSize: 10,
      minPoolSize: 2,
      connectTimeoutMS: 30000,
      maxIdleTimeMS: 300000, // 5 minutes
      retryWrites: true,
      retryReads: true,
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
  // Handle both Date objects and date strings
  // All times are in LOCAL timezone to match user's expectations
  let year, month, day;
  
  if (visitDate instanceof Date) {
    // Get local date components from the Date object
    year = visitDate.getFullYear();
    month = visitDate.getMonth() + 1; // getMonth() returns 0-11
    day = visitDate.getDate();
  } else if (typeof visitDate === 'string') {
    // Parse the date string (format: YYYY-MM-DD)
    [year, month, day] = visitDate.split('-').map(Number);
  } else {
    // Fallback: try to create Date from the value and extract local components
    const tempDate = new Date(visitDate);
    year = tempDate.getFullYear();
    month = tempDate.getMonth() + 1;
    day = tempDate.getDate();
  }
  
  // Parse the time string (format: HH:MM)
  const [hours, minutes] = (visitTime || '10:00').split(':').map(Number);
  
  // Create a new Date object in LOCAL timezone with the exact date and time
  // Note: month is 0-indexed in JavaScript Date constructor
  const dateObj = new Date(year, month - 1, day, hours || 10, minutes || 0, 0, 0);
  
  return dateObj;
};

const check24HourReminders = async () => {
  try {
    await connectDB();
    
    const now = new Date();
    
    // Get header name once for all emails
    const headerName = await getHeaderName();
    
    // Find all visits that haven't been notified for 24h and are in the future
    const visits = await Visit.find({
      notified24h: false,
      visitDate: { $gte: now } // Only future visits
    }).populate('studentId', 'name email');

    console.log(`📋 Found ${visits.length} visits to check for 24h reminders`);

    for (const visit of visits) {
      if (!visit.visitTime || !visit.studentId) {
        console.log(`⏭️  Skipping visit ${visit._id}: Missing visitTime or studentId`);
        continue;
      }

      const student = visit.studentId;
      if (!student || !student.email) {
        console.log(`⏭️  Skipping visit ${visit._id}: Student email not found`);
        continue;
      }

      const visitDateTime = getVisitDateTime(visit.visitDate, visit.visitTime);
      const timeDiff = visitDateTime.getTime() - now.getTime();
      const hoursUntilVisit = timeDiff / (1000 * 60 * 60);
      
      // Debug logging
      console.log(`🔍 [24h Check] Visit ${visit._id}: ${hoursUntilVisit.toFixed(2)}h until visit, student: ${student.name}, email: ${student.email}`);

      // Only send 24h reminder if it's approximately 24 hours before (between 23.5 and 24.5 hours)
      // Instant reminders are handled separately when visit is created/updated
      if (hoursUntilVisit >= 23.5 && hoursUntilVisit <= 24.5) {
        try {
          await sendVisitReminder(
            student.email,
            student.name,
            visit.visitDate,
            visit.visitTime,
            '24h',
            visit.assignment || '',
            visit.remarks || '',
            null,
            headerName
          );
          visit.notified24h = true;
          await visit.save();
          console.log(`✅ 24h email reminder sent to ${student.email} for ${student.name}`);
        } catch (error) {
          console.error(`❌ Failed to send 24h email reminder to ${student.email}:`, error);
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
    
    // Get header name once for all emails
    const headerName = await getHeaderName();
    
    // Find all visits that haven't been notified for 6h and are in the future
    const visits = await Visit.find({
      notified6h: false,
      visitDate: { $gte: now } // Only future visits
    }).populate('studentId', 'name email');

    console.log(`📋 Found ${visits.length} visits to check for 6h reminders`);

    for (const visit of visits) {
      if (!visit.visitTime || !visit.studentId) {
        console.log(`⏭️  Skipping visit ${visit._id}: Missing visitTime or studentId`);
        continue;
      }

      const student = visit.studentId;
      if (!student || !student.email) {
        console.log(`⏭️  Skipping visit ${visit._id}: Student email not found`);
        continue;
      }

      const visitDateTime = getVisitDateTime(visit.visitDate, visit.visitTime);
      const timeDiff = visitDateTime.getTime() - now.getTime();
      const hoursUntilVisit = timeDiff / (1000 * 60 * 60);
      
      // Debug logging
      console.log(`🔍 [6h Check] Visit ${visit._id}: ${hoursUntilVisit.toFixed(2)}h until visit, student: ${student.name}, email: ${student.email}`);

      if (hoursUntilVisit >= 5.5 && hoursUntilVisit <= 6.5) {
        const student = await Student.findById(visit.studentId._id || visit.studentId);
        if (student && student.email) {
          try {
            await sendVisitReminder(
              student.email,
              student.name,
              visit.visitDate,
              visit.visitTime,
              '6h',
              visit.assignment || '',
              visit.remarks || '',
              null,
              headerName
            );
            visit.notified6h = true;
            await visit.save();
            console.log(`✅ 6h email reminder sent to ${student.email} for ${student.name}`);
          } catch (error) {
            console.error(`❌ Failed to send 6h email reminder to ${student.email}:`, error);
          }
        } else {
          console.log(`Skipping visit ${visit._id}: Student email not found`);
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

