const express = require('express');
const router = express.Router();
const Visit = require('../models/Visit');
const { check24HourReminders, check6HourReminders, sendInstantReminder } = require('../services/visitNotificationService');

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
    const visit = await Visit.findByIdAndDelete(req.params.id);
    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    res.json({ message: 'Visit deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

