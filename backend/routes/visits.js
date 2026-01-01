const express = require('express');
const router = express.Router();
const Visit = require('../models/Visit');

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

