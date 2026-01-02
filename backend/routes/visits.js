const express = require('express');
const router = express.Router();
const Visit = require('../models/Visit');
const { check24HourReminders, check6HourReminders, sendInstantReminder } = require('../services/visitNotificationService');
const { sendVisitCancellation } = require('../utils/emailService');
const User = require('../models/User');

// Get all visits for a student
router.get('/student/:studentId', async (req, res) => {
  try {
    const visits = await Visit.find({ studentId: req.params.studentId })
      .sort({ visitDate: -1 });
    res.json(visits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get visit by ID
router.get('/:id', async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id)
      .populate('studentId', 'rollNumber name batch');
    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    res.json(visit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create visit
router.post('/', async (req, res) => {
  try {
    const visit = new Visit(req.body);
    await visit.save();
    
    // Send instant reminder immediately
    // In Lambda, we need to await this to ensure it executes before Lambda terminates
    // Lambda functions terminate after response, so we must complete email sending first
    try {
      console.log(`📬 Visit created with ID: ${visit._id}, triggering instant reminder...`);
      // Await the email sending to ensure it completes in Lambda
      // Use Promise.race with timeout to prevent blocking too long
      const emailPromise = sendInstantReminder(visit._id);
      const timeoutPromise = new Promise((resolve) => 
        setTimeout(() => resolve({ timeout: true }), 5000)
      );
      
      // Race between email sending and timeout (5 seconds max wait)
      const result = await Promise.race([emailPromise, timeoutPromise]);
      
      if (result && result.timeout) {
        console.warn(`⚠️  Instant reminder for visit ${visit._id} timed out after 5 seconds`);
        // Continue anyway - email might still send in background
      } else {
        console.log(`✅ Instant reminder process completed for visit ${visit._id}`);
      }
    } catch (error) {
      // Don't fail the request if email fails
      console.error('❌ Error sending instant reminder after visit creation:', error);
      console.error('Error stack:', error.stack);
    }
    
    res.status(201).json(visit);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update visit
router.put('/:id', async (req, res) => {
  try {
    const visit = await Visit.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    
    // If visit date/time was updated, reset notification flags and send instant reminder
    if (req.body.visitDate || req.body.visitTime) {
      // Reset notification flags if date/time changed
      visit.notified24h = false;
      visit.notified6h = false;
      await visit.save();
      
      // Send instant reminder immediately
      // In Lambda, we need to await this to ensure it executes before Lambda terminates
      try {
        console.log(`📬 Visit updated with ID: ${visit._id}, triggering instant reminder...`);
        // Await the email sending to ensure it completes in Lambda
        // Use Promise.race with timeout to prevent blocking too long
        const emailPromise = sendInstantReminder(visit._id);
        const timeoutPromise = new Promise((resolve) => 
          setTimeout(() => resolve({ timeout: true }), 5000)
        );
        
        // Race between email sending and timeout (5 seconds max wait)
        const result = await Promise.race([emailPromise, timeoutPromise]);
        
        if (result && result.timeout) {
          console.warn(`⚠️  Instant reminder for visit ${visit._id} timed out after 5 seconds`);
          // Continue anyway - email might still send in background
        } else {
          console.log(`✅ Instant reminder process completed for visit ${visit._id}`);
        }
      } catch (error) {
        // Don't fail the request if email fails
        console.error('❌ Error sending instant reminder after visit update:', error);
        console.error('Error stack:', error.stack);
      }
    }
    
    res.json(visit);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete visit
router.delete('/:id', async (req, res) => {
  try {
    // Find and populate student before deleting
    const visit = await Visit.findById(req.params.id).populate('studentId', 'name email');
    
    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    // Send cancellation email if student has email
    if (visit.studentId && visit.studentId.email) {
      try {
        // Get header name for email
        const headerUser = await User.findOne().select('headerName').sort({ updatedAt: -1 });
        const headerName = headerUser?.headerName || 'Spectrum Student Data';
        
        console.log(`📧 Sending cancellation email to ${visit.studentId.email} for visit ${visit._id}...`);
        
        await sendVisitCancellation(
          visit.studentId.email,
          visit.studentId.name,
          visit.visitDate,
          visit.visitTime || '10:00',
          headerName
        );
        
        console.log(`✅ Cancellation email sent successfully to ${visit.studentId.email}`);
      } catch (emailError) {
        // Don't fail the delete if email fails, but log it
        console.error('❌ Error sending cancellation email:', emailError);
        console.error('   Visit will still be deleted');
      }
    } else {
      console.log(`⏭️  Skipping cancellation email for visit ${visit._id}: Student email not found`);
    }

    // Delete the visit
    await Visit.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Visit deleted successfully' });
  } catch (error) {
    console.error('Error deleting visit:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

