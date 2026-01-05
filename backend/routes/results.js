const express = require('express');
const router = express.Router();
const StudentTestResult = require('../models/StudentTestResult');
const StudentTopicStatus = require('../models/StudentTopicStatus');

// Helper function to update subtopic counts (can be called synchronously or in background)
const updateSubtopicCounts = async (studentId, waitForCompletion = false) => {
  try {
    // Get all syllabus to build a subtopic lookup map
    const Syllabus = require('../models/Syllabus');
    const QuestionRecord = require('../models/QuestionRecord');
    const allSyllabus = await Syllabus.find().lean(); // Use lean() for better performance
    
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

    // Get all question records for this student from QuestionRecord collection
    const allQuestions = await QuestionRecord.find({ studentId }).lean();

    // Count occurrences across all questions
    const counts = {};

    allQuestions.forEach(question => {
      const { subject, type, subtopic } = question;
      
      if (subtopic && subtopic.trim()) {
        const key = `${subject}:${subtopic.trim()}`;
        if (subtopicMap[key]) {
          const { topicName, subtopicName } = subtopicMap[key];
          const countKey = `${subject}:${topicName}:${subtopicName}`;
          if (!counts[countKey]) {
            counts[countKey] = { negative: 0, unattempted: 0 };
          }
          
          // Increment the appropriate counter based on question type
          if (type === 'negative') {
            counts[countKey].negative += 1;
          } else if (type === 'unattempted') {
            counts[countKey].unattempted += 1;
          }
        }
      }
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
    if (waitForCompletion) {
      throw error; // Throw if we're waiting for completion
    }
    // Don't throw - this is a background operation
  }
};

// Export the function so it can be used in other routes
module.exports.updateSubtopicCounts = updateSubtopicCounts;

// Get all results for a student
router.get('/student/:studentId', async (req, res) => {
  try {
    const results = await StudentTestResult.find({ studentId: req.params.studentId })
      .populate('testId', 'testName testDate maxMarks')
      .sort({ 'testId.testDate': -1 })
      .lean(); // Use lean() for better performance
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
    
    // Update subtopic counts in background (don't wait - return response immediately)
    if (result.studentId) {
      updateSubtopicCounts(result.studentId, false).catch(err => {
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

// Update result (for editing questions and remarks)
router.put('/:id', async (req, res) => {
  try {
    const result = await StudentTestResult.findById(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    // Update subject data if provided
    if (req.body.physics) {
      result.physics = {
        right: req.body.physics.right !== undefined ? req.body.physics.right : (result.physics.right || 0),
        wrong: req.body.physics.wrong !== undefined ? req.body.physics.wrong : (result.physics.wrong || 0),
        unattempted: req.body.physics.unattempted !== undefined ? req.body.physics.unattempted : (result.physics.unattempted || 0),
        score: req.body.physics.score !== undefined ? req.body.physics.score : (result.physics.score || 0),
        unattemptedQuestions: Array.isArray(req.body.physics.unattemptedQuestions) 
          ? req.body.physics.unattemptedQuestions 
          : (result.physics.unattemptedQuestions || []),
        negativeQuestions: Array.isArray(req.body.physics.negativeQuestions) 
          ? req.body.physics.negativeQuestions 
          : (result.physics.negativeQuestions || [])
      };
    }

    if (req.body.chemistry) {
      result.chemistry = {
        right: req.body.chemistry.right !== undefined ? req.body.chemistry.right : (result.chemistry.right || 0),
        wrong: req.body.chemistry.wrong !== undefined ? req.body.chemistry.wrong : (result.chemistry.wrong || 0),
        unattempted: req.body.chemistry.unattempted !== undefined ? req.body.chemistry.unattempted : (result.chemistry.unattempted || 0),
        score: req.body.chemistry.score !== undefined ? req.body.chemistry.score : (result.chemistry.score || 0),
        unattemptedQuestions: Array.isArray(req.body.chemistry.unattemptedQuestions) 
          ? req.body.chemistry.unattemptedQuestions 
          : (result.chemistry.unattemptedQuestions || []),
        negativeQuestions: Array.isArray(req.body.chemistry.negativeQuestions) 
          ? req.body.chemistry.negativeQuestions 
          : (result.chemistry.negativeQuestions || [])
      };
    }

    if (req.body.maths) {
      result.maths = {
        right: req.body.maths.right !== undefined ? req.body.maths.right : (result.maths.right || 0),
        wrong: req.body.maths.wrong !== undefined ? req.body.maths.wrong : (result.maths.wrong || 0),
        unattempted: req.body.maths.unattempted !== undefined ? req.body.maths.unattempted : (result.maths.unattempted || 0),
        score: req.body.maths.score !== undefined ? req.body.maths.score : (result.maths.score || 0),
        unattemptedQuestions: Array.isArray(req.body.maths.unattemptedQuestions) 
          ? req.body.maths.unattemptedQuestions 
          : (result.maths.unattemptedQuestions || []),
        negativeQuestions: Array.isArray(req.body.maths.negativeQuestions) 
          ? req.body.maths.negativeQuestions 
          : (result.maths.negativeQuestions || [])
      };
    }

    // Update remarks if provided
    if (req.body.remarks !== undefined) {
      result.remarks = req.body.remarks;
    }

    // Save the document
    await result.save();
    
    // Populate student and test data
    await result.populate('studentId', 'rollNumber name batch');
    await result.populate('testId', 'testName testDate maxMarks');
    
    // Update subtopic counts in background
    if (result.studentId) {
      const studentId = result.studentId._id || result.studentId;
      updateSubtopicCounts(studentId, false).catch(err => {
        console.error('Background count update failed:', err);
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Update result error:', error);
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
      .limit(limit)
      .lean(); // Use lean() for better performance on read-only queries

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

// Export router and the updateSubtopicCounts function
router.updateSubtopicCounts = updateSubtopicCounts;
module.exports = router;

