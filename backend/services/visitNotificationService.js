const cron = require('node-cron');
const Visit = require('../models/Visit');
const Student = require('../models/Student');
const User = require('../models/User');
const { sendVisitReminder } = require('../utils/emailService');

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

/**
 * Calculate the exact datetime for a visit by combining date and time
 */
const getVisitDateTime = (visitDate, visitTime) => {
  const date = new Date(visitDate);
  const [hours, minutes] = visitTime.split(':').map(Number);
  date.setHours(hours || 10, minutes || 0, 0, 0);
  return date;
};

/**
 * Check and send 24-hour reminders
 */
const check24HourReminders = async () => {
  try {
    const now = new Date();
    
    // Get header name once for all emails
    const headerName = await getHeaderName();
    
    // Find all visits that haven't been notified for 24h
    // We'll check the actual datetime in the loop to ensure they're in the future
    const visits = await Visit.find({
      notified24h: false
    }).populate('studentId', 'name email');

    console.log(`📋 Found ${visits.length} visits to check for 24h reminders`);

    for (const visit of visits) {
      const student = visit.studentId;
      if (!student || !student.email) {
        console.log(`⏭️  Skipping visit ${visit._id}: Student email not found`);
        continue;
      }

      const visitDateTime = getVisitDateTime(visit.visitDate, visit.visitTime || '10:00');
      const timeDiff = visitDateTime.getTime() - now.getTime();
      const hoursUntil = timeDiff / (1000 * 60 * 60);
      
      // Skip if visit is in the past
      if (hoursUntil <= 0) {
        continue;
      }
      
      // Debug logging
      console.log(`🔍 [24h Check] Visit ${visit._id}: ${hoursUntil.toFixed(2)}h until visit, student: ${student.name}, email: ${student.email}`);

      // Only send 24h reminder if it's approximately 24 hours before (between 23.5 and 24.5 hours)
      // Instant reminders are handled separately when visit is created/updated
      if (hoursUntil >= 23.5 && hoursUntil <= 24.5) {
        try {
          await sendVisitReminder(
            student.email,
            student.name,
            visit.visitDate,
            visit.visitTime || '10:00',
            '24h',
            visit.assignment || '',
            visit.remarks || '',
            hoursUntil, // Pass actual hours until for better email content
            headerName
          );
          
          // Mark as notified
          visit.notified24h = true;
          await visit.save();
          
          console.log(`✅ 24-hour email reminder sent to ${student.email} for visit on ${visit.visitDate}`);
        } catch (error) {
          console.error(`❌ Failed to send 24-hour email reminder to ${student.email}:`, error.message);
          console.error('Full error:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error checking 24-hour reminders:', error);
  }
};

/**
 * Check and send 6-hour reminders
 */
const check6HourReminders = async () => {
  try {
    const now = new Date();
    
    // Get header name once for all emails
    const headerName = await getHeaderName();
    
    // Find all visits that haven't been notified for 6h
    // We'll check the actual datetime in the loop to ensure they're in the future
    const visits = await Visit.find({
      notified6h: false
    }).populate('studentId', 'name email');

    console.log(`📋 Found ${visits.length} visits to check for 6h reminders`);

    for (const visit of visits) {
      const student = visit.studentId;
      if (!student || !student.email) {
        console.log(`⏭️  Skipping visit ${visit._id}: Student email not found`);
        continue;
      }

      const visitDateTime = getVisitDateTime(visit.visitDate, visit.visitTime || '10:00');
      const timeDiff = visitDateTime.getTime() - now.getTime();
      const hoursUntil = timeDiff / (1000 * 60 * 60);
      
      // Skip if visit is in the past
      if (hoursUntil <= 0) {
        continue;
      }
      
      // Debug logging
      console.log(`🔍 [6h Check] Visit ${visit._id}: ${hoursUntil.toFixed(2)}h until visit, student: ${student.name}, email: ${student.email}`);

      // Check if it's approximately 6 hours before (between 5.5 and 6.5 hours)
      if (hoursUntil >= 5.5 && hoursUntil <= 6.5) {
        try {
          await sendVisitReminder(
            student.email,
            student.name,
            visit.visitDate,
            visit.visitTime || '10:00',
            '6h',
            visit.assignment || '',
            visit.remarks || '',
            hoursUntil, // Pass actual hours until for better email content
            headerName
          );
          
          // Mark as notified
          visit.notified6h = true;
          await visit.save();
          
          console.log(`✅ 6-hour email reminder sent to ${student.email} for visit on ${visit.visitDate}`);
        } catch (error) {
          console.error(`❌ Failed to send 6-hour email reminder to ${student.email}:`, error.message);
          console.error('Full error:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error checking 6-hour reminders:', error);
  }
};

/**
 * Start the cron jobs for visit notifications
 */
const startVisitNotificationService = () => {
  // Run every 15 minutes to check for reminders
  // This ensures we catch visits within the notification windows
  cron.schedule('*/15 * * * *', () => {
    console.log('🔔 Checking visit reminders...');
    check24HourReminders();
    check6HourReminders();
  });

  console.log('✅ Visit notification service started (checks every 15 minutes)');
};

/**
 * Send instant reminder for a newly created/updated visit
 */
const sendInstantReminder = async (visitId) => {
  try {
    const visit = await Visit.findById(visitId).populate('studentId', 'name email');
    
    if (!visit) {
      console.log(`⏭️  Visit ${visitId} not found for instant reminder`);
      return;
    }

    const student = visit.studentId;
    if (!student || !student.email) {
      console.log(`⏭️  Skipping instant reminder for visit ${visitId}: Student email not found`);
      return;
    }

    const now = new Date();
    const visitDateTime = getVisitDateTime(visit.visitDate, visit.visitTime || '10:00');
    const timeDiff = visitDateTime.getTime() - now.getTime();
    const hoursUntil = timeDiff / (1000 * 60 * 60);

    // Only send instant reminder for future visits
    if (hoursUntil <= 0) {
      console.log(`⏭️  Skipping instant reminder for visit ${visitId}: Visit is in the past`);
      return;
    }

    // Get header name
    const headerName = await getHeaderName();

    // Send instant reminder - always use 'instant' type for instant reminders
    try {
      console.log(`📧 Attempting to send instant reminder email to ${student.email} for visit ${visitId}...`);
      console.log(`   Student: ${student.name}, Email: ${student.email}`);
      console.log(`   Visit Date: ${visit.visitDate}, Visit Time: ${visit.visitTime || '10:00'}`);
      console.log(`   Hours until visit: ${hoursUntil.toFixed(2)}`);
      console.log(`   Email User: ${process.env.EMAIL_USER || 'not set'}`);
      console.log(`   Email Password: ${process.env.EMAIL_PASSWORD ? '***set***' : 'not set'}`);
      
      const result = await sendVisitReminder(
        student.email,
        student.name,
        visit.visitDate,
        visit.visitTime || '10:00',
        'instant', // Always use 'instant' type for instant reminders
        visit.assignment || '',
        visit.remarks || '',
        hoursUntil, // Pass actual hours until visit
        headerName
      );

      if (result && result.success) {
        // Mark flags based on hours until to prevent duplicate reminders
        // IMPORTANT: Only mark flags if visit is within the reminder window
        // If visit is MORE than 24h away, keep notified24h=false so 24h reminder can be sent later
        // If visit is MORE than 6h away, keep notified6h=false so 6h reminder can be sent later
        // This ensures all 3 emails are sent: instant, 24h before, and 6h before
        if (hoursUntil < 24) {
          // Visit is less than 24h away, so we've already sent instant reminder
          // Skip the 24h reminder since it's too close
          visit.notified24h = true;
        }
        // Note: We don't set notified24h=false here if hoursUntil >= 24, it stays false (default)
        
        if (hoursUntil < 6) {
          // Visit is less than 6h away, so we've already sent instant reminder
          // Skip the 6h reminder since it's too close
          visit.notified6h = true;
        }
        // Note: We don't set notified6h=false here if hoursUntil >= 6, it stays false (default)
        
        await visit.save();

        console.log(`✅ Instant email reminder sent successfully to ${student.email} for visit on ${visit.visitDate} (${hoursUntil.toFixed(1)}h notice)`);
        console.log(`   📌 Reminder flags: notified24h=${visit.notified24h}, notified6h=${visit.notified6h}`);
        console.log(`   📧 Message ID: ${result.messageId || 'N/A'}`);
        return { success: true, messageId: result.messageId };
      } else {
        console.error(`❌ Failed to send instant email reminder to ${student.email}: Email service returned unsuccessful result`);
        console.error(`   Result:`, result);
        return { success: false, error: 'Email service returned unsuccessful result' };
      }
    } catch (error) {
      console.error(`❌ Failed to send instant email reminder to ${student.email}:`, error.message);
      console.error('Full error:', error);
      console.error('Error stack:', error.stack);
      throw error; // Re-throw to ensure it's caught by the calling code
    }
  } catch (error) {
    console.error(`Error sending instant reminder for visit ${visitId}:`, error);
  }
};

module.exports = {
  startVisitNotificationService,
  check24HourReminders,
  check6HourReminders,
  sendInstantReminder
};

