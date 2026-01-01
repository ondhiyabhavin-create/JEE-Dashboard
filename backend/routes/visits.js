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
    
    // Send instant reminder immediately (runs in background, doesn't block the response)
    setImmediate(async () => {
      try {
        await sendInstantReminder(visit._id);
        // Also check for scheduled reminders (24h and 6h) in case instant wasn't sent
        await check24HourReminders();
        await check6HourReminders();
      } catch (error) {
        console.error('Error sending instant reminder after visit creation:', error);
      }
    });
    
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
      
      // Send instant reminder and check for scheduled reminders
      setImmediate(async () => {
        try {
          await sendInstantReminder(visit._id);
          // Also check for scheduled reminders (24h and 6h) in case instant wasn't sent
          await check24HourReminders();
          await check6HourReminders();
        } catch (error) {
          console.error('Error sending instant reminder after visit update:', error);
        }
      });
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

