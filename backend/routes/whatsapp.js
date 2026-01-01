const express = require('express');
const router = express.Router();
const { initializeWhatsApp, sendVisitReminderWhatsApp } = require('../utils/whatsappService');

/**
 * POST /api/whatsapp/configure
 * Configure WhatsApp service with sender credentials
 * Body: {
 *   accountSid: string (for Twilio),
 *   authToken: string (for Twilio),
 *   fromNumber: string (sender WhatsApp number, format: +1234567890 or whatsapp:+1234567890),
 *   provider: 'twilio' | 'custom'
 * }
 */
router.post('/configure', async (req, res) => {
  try {
    const { accountSid, authToken, fromNumber, provider = 'twilio' } = req.body;

    if (!fromNumber) {
      return res.status(400).json({ error: 'Sender phone number (fromNumber) is required' });
    }

    if (provider === 'twilio' && (!accountSid || !authToken)) {
      return res.status(400).json({ error: 'Twilio Account SID and Auth Token are required for Twilio provider' });
    }

    initializeWhatsApp({
      accountSid,
      authToken,
      fromNumber,
      provider
    });

    res.json({ 
      success: true, 
      message: 'WhatsApp service configured successfully',
      fromNumber: fromNumber.replace(/whatsapp:/g, '') // Return without whatsapp: prefix for display
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/whatsapp/status
 * Get current WhatsApp service configuration status
 */
router.get('/status', (req, res) => {
  res.json({
    enabled: process.env.WHATSAPP_ENABLED === 'true' || false,
    provider: process.env.WHATSAPP_PROVIDER || 'not configured',
    fromNumber: process.env.WHATSAPP_FROM_NUMBER ? process.env.WHATSAPP_FROM_NUMBER.replace(/whatsapp:/g, '') : 'not configured'
  });
});

/**
 * POST /api/whatsapp/test
 * Send a test WhatsApp message
 * Body: {
 *   toNumber: string (recipient phone number),
 *   message: string (optional, default test message)
 * }
 */
router.post('/test', async (req, res) => {
  try {
    const { toNumber, message } = req.body;

    if (!toNumber) {
      return res.status(400).json({ error: 'Recipient phone number (toNumber) is required' });
    }

    const testMessage = message || 'This is a test message from Spectrum Student Data WhatsApp service.';

    // Use a dummy date/time for test
    await sendVisitReminderWhatsApp(
      toNumber,
      'Test Student',
      new Date(),
      '10:00',
      '24h'
    );

    res.json({ 
      success: true, 
      message: 'Test WhatsApp message sent successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


