const express = require('express');
const router = express.Router();
const StudentTopicStatus = require('../models/StudentTopicStatus');
const Syllabus = require('../models/Syllabus');

// Get all topic statuses for a student
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    const statuses = await StudentTopicStatus.find({ studentId });

    res.json({ success: true, data: statuses });
  } catch (error) {
    console.error('Get student topic statuses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk get topic statuses for multiple students (for backlog page optimization)
router.post('/students/bulk', async (req, res) => {
  try {
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      // Ensure CORS headers are set on error responses
      res.header('Access-Control-Allow-Origin', '*');
      return res.status(400).json({ error: 'studentIds must be a non-empty array' });
    }

    // Limit to 200 students per request to avoid overwhelming the server
    const limitedIds = studentIds.slice(0, 200);
    
    const statuses = await StudentTopicStatus.find({
      studentId: { $in: limitedIds }
    });

    // Group by studentId for easier frontend processing
    const groupedByStudent = {};
    statuses.forEach((status) => {
      const studentId = status.studentId.toString();
      if (!groupedByStudent[studentId]) {
        groupedByStudent[studentId] = [];
      }
      groupedByStudent[studentId].push(status);
    });

    res.json({ success: true, data: groupedByStudent });
  } catch (error) {
    console.error('Bulk get student topic statuses error:', error);
    // Ensure CORS headers are set on error responses
    res.header('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update or create student topic status (for both topic and subtopic level)
router.post('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { subject, topicName, subtopicName, status, theoryCompleted, solvingCompleted } = req.body;

    if (!subject || !topicName) {
      return res.status(400).json({ error: 'Subject and topic name are required' });
    }

    // Verify the topic exists in the syllabus
    const syllabus = await Syllabus.findOne({ subject });
    if (!syllabus) {
      return res.status(404).json({ error: 'Subject not found in syllabus' });
    }

    const topic = syllabus.topics.find(t => t.name === topicName);
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found in syllabus' });
    }

    // If subtopicName is provided, verify it exists
    if (subtopicName) {
      const subtopicExists = topic.subtopics.some(
        st => st.toLowerCase() === subtopicName.toLowerCase()
      );

      if (!subtopicExists) {
        return res.status(400).json({ error: 'Subtopic not found in topic' });
      }
    }

    // Update or create the status document
    const updateData = {};
    // Handle status: if explicitly set (including null), update it
    if (status !== undefined) {
      updateData.status = status; // Can be null to clear, or a status value
    }
    if (theoryCompleted !== undefined) updateData.theoryCompleted = theoryCompleted;
    if (solvingCompleted !== undefined) updateData.solvingCompleted = solvingCompleted;

    const statusDoc = await StudentTopicStatus.findOneAndUpdate(
      { studentId, subject, topicName, subtopicName: subtopicName || '' },
      updateData,
      { upsert: true, new: true }
    );

    // If this is a topic-level update, auto-apply changes to all subtopics
    if (!subtopicName) {
      const subtopics = topic.subtopics || [];
      
      if (subtopics.length > 0) {
        // Get final values after update
        const finalStatus = status !== undefined ? status : statusDoc.status; // Preserve null if explicitly set
        const finalTheoryCompleted = theoryCompleted !== undefined ? theoryCompleted : statusDoc.theoryCompleted;
        const finalSolvingCompleted = solvingCompleted !== undefined ? solvingCompleted : statusDoc.solvingCompleted;
        
        // Build update object - only update fields that were changed
        const subtopicUpdateData = {};
        if (status !== undefined) {
          subtopicUpdateData.status = finalStatus; // Can be null to clear
        }
        if (theoryCompleted !== undefined) {
          subtopicUpdateData.theoryCompleted = finalTheoryCompleted;
        }
        if (solvingCompleted !== undefined) {
          subtopicUpdateData.solvingCompleted = finalSolvingCompleted;
        }
        
        // Only update if there are changes to propagate
        if (Object.keys(subtopicUpdateData).length > 0) {
          const subtopicUpdates = subtopics.map(subtopic => ({
            updateOne: {
              filter: {
                studentId,
                subject,
                topicName,
                subtopicName: subtopic
              },
              update: {
                $set: subtopicUpdateData
              },
              upsert: true
            }
          }));

          await StudentTopicStatus.bulkWrite(subtopicUpdates);
        }
      }
    }

    res.json({ success: true, data: statusDoc });
  } catch (error) {
    console.error('Update student topic status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Increment negative count for a subtopic
router.post('/student/:studentId/negative', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { subject, topicName, subtopicName } = req.body;

    if (!subject || !topicName || !subtopicName) {
      return res.status(400).json({ error: 'Subject, topic name, and subtopic name are required' });
    }

    const statusDoc = await StudentTopicStatus.findOneAndUpdate(
      { studentId, subject, topicName, subtopicName },
      { $inc: { negativeCount: 1 } },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: statusDoc });
  } catch (error) {
    console.error('Increment negative count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

