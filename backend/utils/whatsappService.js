// WhatsApp Service for sending visit reminders
// This service can be configured to use different WhatsApp APIs
// Currently supports Twilio WhatsApp API

let whatsappConfig = {
  enabled: false,
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  fromNumber: process.env.WHATSAPP_FROM_NUMBER || '', // Format: whatsapp:+1234567890
  provider: 'twilio' // or 'custom' for custom implementation
};

/**
 * Initialize WhatsApp service with configuration
 */
const initializeWhatsApp = (config) => {
  whatsappConfig = { ...whatsappConfig, ...config };
  whatsappConfig.enabled = true;
  console.log('✅ WhatsApp service initialized');
};

/**
 * Format phone number for WhatsApp (add country code if missing, ensure whatsapp: prefix)
 */
const formatPhoneNumber = (phoneNumber) => {
  // Remove any spaces, dashes, or parentheses
  let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  // Remove whatsapp: prefix if present
  if (cleaned.startsWith('whatsapp:')) {
    cleaned = cleaned.replace('whatsapp:', '');
  }
  
  // If it doesn't start with +, assume it's an Indian number and add +91
  // You can modify this logic based on your needs
  if (!cleaned.startsWith('+')) {
    // If it starts with 0, remove it
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    // Add +91 for Indian numbers (modify as needed)
    cleaned = `+91${cleaned}`;
  }
  
  return `whatsapp:${cleaned}`;
};

/**
 * Send WhatsApp message using Twilio
 */
const sendWhatsAppViaTwilio = async (toNumber, message) => {
  if (!whatsappConfig.accountSid || !whatsappConfig.authToken || !whatsappConfig.fromNumber) {
    throw new Error('Twilio credentials not configured. Please configure WhatsApp service first.');
  }

  let twilio;
  try {
    twilio = require('twilio');
  } catch (error) {
    throw new Error('Twilio package not installed. Run: npm install twilio');
  }
  
  const client = twilio(whatsappConfig.accountSid, whatsappConfig.authToken);

  // Format phone numbers
  const formattedTo = formatPhoneNumber(toNumber);
  const formattedFrom = formatPhoneNumber(whatsappConfig.fromNumber);

  try {
    const messageResult = await client.messages.create({
      from: formattedFrom,
      to: formattedTo,
      body: message
    });
    
    console.log(`WhatsApp message sent: ${messageResult.sid}`);
    return { success: true, messageId: messageResult.sid };
  } catch (error) {
    console.error('Error sending WhatsApp message via Twilio:', error);
    throw error;
  }
};

/**
 * Send WhatsApp message using custom implementation
 * You can implement your own WhatsApp API here
 */
const sendWhatsAppViaCustom = async (toNumber, message) => {
  // TODO: Implement your custom WhatsApp API here
  // This could be WhatsApp Web API, WhatsApp Business API, etc.
  console.log('Custom WhatsApp implementation not yet configured');
  throw new Error('Custom WhatsApp implementation not configured');
};

/**
 * Send visit reminder via WhatsApp
 */
const sendVisitReminderWhatsApp = async (phoneNumber, studentName, visitDate, visitTime, reminderType) => {
  if (!whatsappConfig.enabled) {
    throw new Error('WhatsApp service is not enabled. Please configure it first.');
  }

  if (!phoneNumber) {
    throw new Error('Student phone number is required');
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return '10:00 AM';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const timeUntil = reminderType === '24h' ? '24 hours' : '6 hours';

  const message = `🔔 *Visit Reminder*

Hello ${studentName},

This is a reminder that you have a scheduled visit coming up:

📅 *Date:* ${formatDate(visitDate)}
⏰ *Time:* ${formatTime(visitTime)}

This reminder is sent ${timeUntil} before your scheduled visit.

Please make sure you are prepared for your visit.

---
*This is an automated reminder from Spectrum Student Data.*`;

  try {
    if (whatsappConfig.provider === 'twilio') {
      return await sendWhatsAppViaTwilio(phoneNumber, message);
    } else if (whatsappConfig.provider === 'custom') {
      return await sendWhatsAppViaCustom(phoneNumber, message);
    } else {
      throw new Error(`Unknown WhatsApp provider: ${whatsappConfig.provider}`);
    }
  } catch (error) {
    console.error('Error sending WhatsApp reminder:', error);
    throw error;
  }
};

module.exports = {
  initializeWhatsApp,
  sendVisitReminderWhatsApp,
  sendWhatsAppViaTwilio,
  sendWhatsAppViaCustom
};

