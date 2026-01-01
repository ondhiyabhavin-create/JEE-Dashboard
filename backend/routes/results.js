const express = require('express');
const router = express.Router();
const StudentTestResult = require('../models/StudentTestResult');

// Get all results for a student
router.get('/student/:studentId', async (req, res) => {
  try {
    const results = await StudentTestResult.find({ studentId: req.params.studentId })
      .populate('testId', 'testName testDate maxMarks')
      .sort({ 'testId.testDate': -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get result by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await StudentTestResult.findById(req.params.id)
      .populate('studentId', 'rollNumber name batch')
      .populate('testId', 'testName testDate maxMarks');
    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create result manually
router.post('/', async (req, res) => {
  try {
    const result = new StudentTestResult(req.body);
    await result.save();
    await result.populate('studentId', 'rollNumber name batch');
    await result.populate('testId', 'testName testDate maxMarks');
    res.status(201).json(result);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Test result already exists for this student and test' });
    }
    res.status(400).json({ error: error.message });
  }
});

// Update result (for editing topic/subtopic and remarks)
router.put('/:id', async (req, res) => {
  try {
    const result = await StudentTestResult.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get results for a test
router.get('/test/:testId', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const results = await StudentTestResult.find({ testId: req.params.testId })
      .populate('studentId', 'rollNumber name batch')
      .sort({ 'totals.rank': 1 })
      .skip(skip)
      .limit(limit);

    const total = await StudentTestResult.countDocuments({ testId: req.params.testId });

    res.json({
      results,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

