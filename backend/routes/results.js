const express = require('express');
const router = express.Router();
const StudentTestResult = require('../models/StudentTestResult');
const StudentTopicStatus = require('../models/StudentTopicStatus');

// Helper function to update subtopic counts (can be called synchronously or in background)
const updateSubtopicCounts = async (studentId, waitForCompletion = false) => {
  try {
    const subjects = ['physics', 'chemistry', 'maths'];
    const subjectMap = {
      'physics': 'Physics',
      'chemistry': 'Chemistry',
      'maths': 'Mathematics'
    };

    // Get all test results for this student
    const allResults = await StudentTestResult.find({ studentId }).lean(); // Use lean() for better performance

    // Get all syllabus to build a subtopic lookup map
    const Syllabus = require('../models/Syllabus');
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
    
    console.log(`✅ Updated counts for student ${studentId}:`, {
      totalSubtopics: Object.keys(counts).length,
      totalNegative: Object.values(counts).reduce((sum, c) => sum + c.negative, 0),
      totalUnattempted: Object.values(counts).reduce((sum, c) => sum + c.unattempted, 0)
    });
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

// Update result (for editing topic/subtopic and remarks)
router.put('/:id', async (req, res) => {
  try {
    // Fetch existing result first to preserve all data
    const existingResult = await StudentTestResult.findById(req.params.id);
    if (!existingResult) {
      return res.status(404).json({ error: 'Result not found' });
    }

    console.log('📥 Received update request:', {
      body: req.body,
      existingPhysics: existingResult.physics,
      existingChemistry: existingResult.chemistry,
      existingMaths: existingResult.maths
    });

    // Build update object using $set operator for proper nested updates
    const updateFields = {};
    
    // If updating a specific subject, merge that subject's data properly
    if (req.body.physics || req.body.chemistry || req.body.maths) {
      ['physics', 'chemistry', 'maths'].forEach(subject => {
        if (req.body[subject]) {
          const existingSubject = existingResult[subject] || {};
          const newSubjectData = req.body[subject];
          
          // Merge subject data, ensuring arrays are properly replaced
          const mergedSubject = {
            right: newSubjectData.right !== undefined ? newSubjectData.right : existingSubject.right,
            wrong: newSubjectData.wrong !== undefined ? newSubjectData.wrong : existingSubject.wrong,
            unattempted: newSubjectData.unattempted !== undefined ? newSubjectData.unattempted : existingSubject.unattempted,
            score: newSubjectData.score !== undefined ? newSubjectData.score : existingSubject.score,
            // Arrays should be replaced if provided, otherwise keep existing
            unattemptedQuestions: newSubjectData.unattemptedQuestions !== undefined 
              ? newSubjectData.unattemptedQuestions 
              : existingSubject.unattemptedQuestions || [],
            negativeQuestions: newSubjectData.negativeQuestions !== undefined 
              ? newSubjectData.negativeQuestions 
              : existingSubject.negativeQuestions || []
          };
          
          updateFields[subject] = mergedSubject;
          
          console.log(`📝 Merged ${subject} data:`, {
            existing: existingSubject,
            new: newSubjectData,
            merged: mergedSubject
          });
        }
      });
    }
    
    // Handle remarks update
    if (req.body.remarks !== undefined) {
      updateFields.remarks = req.body.remarks;
    }

    console.log('📤 Update fields:', updateFields);

    // Update the document using $set to ensure proper nested updates
    const result = await StudentTestResult.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );
    
    console.log('✅ Updated result:', {
      physics: result.physics,
      chemistry: result.chemistry,
      maths: result.maths
    });
    
    // Populate student and test data
    await result.populate('studentId', 'rollNumber name batch');
    await result.populate('testId', 'testName testDate maxMarks');
    
    // Update subtopic counts in background (don't wait - return response immediately)
    if (result.studentId) {
      updateSubtopicCounts(result.studentId, false).catch(err => {
        console.error('Background count update failed:', err);
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('❌ Update result error:', error);
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

