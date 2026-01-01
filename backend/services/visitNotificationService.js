const cron = require('node-cron');
const Visit = require('../models/Visit');
const Student = require('../models/Student');
const { sendVisitReminderWhatsApp } = require('../utils/whatsappService');

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
    
    // Find all visits that haven't been notified for 24h and are in the future
    const visits = await Visit.find({
      notified24h: false,
      visitDate: { $gte: now } // Only future visits
    }).populate('studentId', 'name contactNumber');

    for (const visit of visits) {
      const student = visit.studentId;
      if (!student || !student.contactNumber) {
        console.log(`Skipping visit ${visit._id}: Student phone number not found`);
        continue;
      }

      const visitDateTime = getVisitDateTime(visit.visitDate, visit.visitTime || '10:00');
      const timeDiff = visitDateTime.getTime() - now.getTime();
      const hoursUntil = timeDiff / (1000 * 60 * 60);

      // Check if it's approximately 24 hours before (between 23.5 and 24.5 hours)
      if (hoursUntil >= 23.5 && hoursUntil <= 24.5) {
        try {
          await sendVisitReminderWhatsApp(
            student.contactNumber,
            student.name,
            visit.visitDate,
            visit.visitTime || '10:00',
            '24h'
          );
          
          // Mark as notified
          visit.notified24h = true;
          await visit.save();
          
          console.log(`✅ 24-hour WhatsApp reminder sent to ${student.contactNumber} for visit on ${visit.visitDate}`);
        } catch (error) {
          console.error(`❌ Failed to send 24-hour WhatsApp reminder to ${student.contactNumber}:`, error.message);
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
    
    // Find all visits that haven't been notified for 6h and are in the future
    const visits = await Visit.find({
      notified6h: false,
      visitDate: { $gte: now } // Only future visits
    }).populate('studentId', 'name contactNumber');

    for (const visit of visits) {
      const student = visit.studentId;
      if (!student || !student.contactNumber) {
        console.log(`Skipping visit ${visit._id}: Student phone number not found`);
        continue;
      }

      const visitDateTime = getVisitDateTime(visit.visitDate, visit.visitTime || '10:00');
      const timeDiff = visitDateTime.getTime() - now.getTime();
      const hoursUntil = timeDiff / (1000 * 60 * 60);

      // Check if it's approximately 6 hours before (between 5.5 and 6.5 hours)
      if (hoursUntil >= 5.5 && hoursUntil <= 6.5) {
        try {
          await sendVisitReminderWhatsApp(
            student.contactNumber,
            student.name,
            visit.visitDate,
            visit.visitTime || '10:00',
            '6h'
          );
          
          // Mark as notified
          visit.notified6h = true;
          await visit.save();
          
          console.log(`✅ 6-hour WhatsApp reminder sent to ${student.contactNumber} for visit on ${visit.visitDate}`);
        } catch (error) {
          console.error(`❌ Failed to send 6-hour WhatsApp reminder to ${student.contactNumber}:`, error.message);
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

module.exports = {
  startVisitNotificationService,
  check24HourReminders,
  check6HourReminders
};

