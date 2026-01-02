const express = require('express');
const router = express.Router();
const StudentTestResult = require('../models/StudentTestResult');
const StudentTopicStatus = require('../models/StudentTopicStatus');

// Helper function to update subtopic counts
const updateSubtopicCounts = async (studentId) => {
  try {
    const subjects = ['physics', 'chemistry', 'maths'];
    const subjectMap = {
      'physics': 'Physics',
      'chemistry': 'Chemistry',
      'maths': 'Mathematics'
    };

    // Get all test results for this student
    const allResults = await StudentTestResult.find({ studentId });

    // Get all syllabus to build a subtopic lookup map
    const Syllabus = require('../models/Syllabus');
    const allSyllabus = await Syllabus.find();
    
    // Build a map: subject -> subtopicName -> { topicName, subtopicName }
    const subtopicMap = {};
    allSyllabus.forEach(subjectItem => {
      subjectItem.topics.forEach(topic => {
        topic.subtopics.forEach(subtopic => {
          const key = `${subjectItem.subject}:${subtopic}`;
          subtopicMap[key] = {
            subject: subjectItem.subject,
            topicName: topic.name,
            subtopicName: subtopic
          };
        });
      });
    });

    // Count occurrences across all tests
    const counts = {};

    allResults.forEach(testResult => {
      subjects.forEach(subjectKey => {
        const subjectName = subjectMap[subjectKey];
        const subjectData = testResult[subjectKey] || {};

        // Count negative questions
        if (subjectData.negativeQuestions && Array.isArray(subjectData.negativeQuestions)) {
          subjectData.negativeQuestions.forEach(q => {
            if (q.subtopic && q.subtopic.trim()) {
              const key = `${subjectName}:${q.subtopic.trim()}`;
              if (subtopicMap[key]) {
                const { topicName, subtopicName } = subtopicMap[key];
                const countKey = `${subjectName}:${topicName}:${subtopicName}`;
                if (!counts[countKey]) {
                  counts[countKey] = { negative: 0, unattempted: 0 };
                }
                counts[countKey].negative += 1;
              }
            }
          });
        }

        // Count unattempted questions
        if (subjectData.unattemptedQuestions && Array.isArray(subjectData.unattemptedQuestions)) {
          subjectData.unattemptedQuestions.forEach(q => {
            if (q.subtopic && q.subtopic.trim()) {
              const key = `${subjectName}:${q.subtopic.trim()}`;
              if (subtopicMap[key]) {
                const { topicName, subtopicName } = subtopicMap[key];
                const countKey = `${subjectName}:${topicName}:${subtopicName}`;
                if (!counts[countKey]) {
                  counts[countKey] = { negative: 0, unattempted: 0 };
                }
                counts[countKey].unattempted += 1;
              }
            }
          });
        }
      });
    });

    // Reset all counts for this student first
    await StudentTopicStatus.updateMany(
      { studentId },
      { $set: { negativeCount: 0, unattemptedCount: 0 } }
    );

    // Update counts in database
    for (const [key, count] of Object.entries(counts)) {
      const [subject, topicName, subtopicName] = key.split(':');
      
      // Update or create StudentTopicStatus
      await StudentTopicStatus.findOneAndUpdate(
        { studentId, subject, topicName, subtopicName },
        {
          $set: {
            negativeCount: count.negative,
            unattemptedCount: count.unattempted
          }
        },
        { upsert: true, new: true }
      );
    }
  } catch (error) {
    console.error('Error updating subtopic counts:', error);
    // Don't throw - this is a background operation
  }
};

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
    
    // Update subtopic counts in background
    if (result.studentId) {
      updateSubtopicCounts(result.studentId).catch(err => {
        console.error('Background count update failed:', err);
      });
    }
    
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
    
    // Update subtopic counts in background
    if (result.studentId) {
      updateSubtopicCounts(result.studentId).catch(err => {
        console.error('Background count update failed:', err);
      });
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

