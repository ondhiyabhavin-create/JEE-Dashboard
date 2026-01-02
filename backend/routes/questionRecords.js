const express = require('express');
const router = express.Router();
const QuestionRecord = require('../models/QuestionRecord');

// Add a question record
router.post('/', async (req, res) => {
  try {
    const { studentId, testId, subject, type, questionNumber, subtopic } = req.body;
    
    if (!studentId || !testId || !subject || !type || !questionNumber || !subtopic) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check for duplicate
    const existing = await QuestionRecord.findOne({
      studentId,
      testId,
      subject,
      type,
      questionNumber,
      subtopic: subtopic.trim()
    });

    if (existing) {
      return res.status(400).json({ error: 'This question is already recorded' });
    }

    const record = new QuestionRecord({
      studentId,
      testId,
      subject,
      type,
      questionNumber: parseInt(questionNumber),
      subtopic: subtopic.trim()
    });

    await record.save();
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'This question is already recorded' });
    }
    console.error('Add question record error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete a question record
router.delete('/:id', async (req, res) => {
  try {
    const record = await QuestionRecord.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'Question record not found' });
    }
    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question record error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get all questions for a student
router.get('/student/:studentId', async (req, res) => {
  try {
    const questions = await QuestionRecord.find({ studentId: req.params.studentId })
      .populate('testId', 'testName testDate')
      .sort({ 'testId.testDate': -1, subject: 1, type: 1, questionNumber: 1 })
      .lean();
    
    res.json({ success: true, data: questions });
  } catch (error) {
    console.error('Get student questions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get questions for a specific test result
router.get('/result/:resultId', async (req, res) => {
  try {
    // First get the result to get studentId and testId
    const StudentTestResult = require('../models/StudentTestResult');
    const result = await StudentTestResult.findById(req.params.resultId).lean();
    
    if (!result) {
      return res.status(404).json({ error: 'Test result not found' });
    }

    const questions = await QuestionRecord.find({
      studentId: result.studentId,
      testId: result.testId
    })
      .sort({ subject: 1, type: 1, questionNumber: 1 })
      .lean();
    
    // Group by subject and type
    const grouped = {
      Physics: { negative: [], unattempted: [] },
      Chemistry: { negative: [], unattempted: [] },
      Mathematics: { negative: [], unattempted: [] }
    };

    questions.forEach(q => {
      const subjectKey = q.subject;
      const typeKey = q.type;
      if (grouped[subjectKey] && grouped[subjectKey][typeKey]) {
        grouped[subjectKey][typeKey].push({
          questionNumber: q.questionNumber,
          subtopic: q.subtopic,
          _id: q._id
        });
      }
    });

    res.json({ success: true, data: grouped });
  } catch (error) {
    console.error('Get result questions error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

