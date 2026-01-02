const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const StudentTestResult = require('../models/StudentTestResult');
const Visit = require('../models/Visit');
const Backlog = require('../models/Backlog');
const StudentTopicStatus = require('../models/StudentTopicStatus');

// Get all students with search and pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const sourceType = req.query.sourceType || ''; // 'manual' or 'excel'
    const skip = (page - 1) * limit;

    const query = {};
    const andConditions = [];
    
    // Build search query
    if (search) {
      andConditions.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { rollNumber: { $regex: search, $options: 'i' } },
          { batch: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      });
    }

    // Filter by sourceType if provided
    if (sourceType) {
      if (sourceType === 'excel') {
        // Include students with 'excel' OR no sourceType (null/undefined) - treat missing as excel
        andConditions.push({
          $or: [
            { sourceType: 'excel' },
            { sourceType: { $exists: false } },
            { sourceType: null }
          ]
        });
      } else if (sourceType === 'manual') {
        // For 'manual', only include students explicitly marked as manual
        andConditions.push({ sourceType: 'manual' });
      }
    }

    // Combine all conditions with $and if we have multiple conditions
    if (andConditions.length > 0) {
      if (andConditions.length === 1) {
        Object.assign(query, andConditions[0]);
      } else {
        query.$and = andConditions;
      }
    }

    const students = await Student.find(query)
      .sort({ rollNumber: 1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Use lean() for better performance on read-only queries

    const total = await Student.countDocuments(query);

    res.json({
      students,
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

// Get student by ID
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create student
router.post('/', async (req, res) => {
  try {
    // Set sourceType to 'manual' if not provided (manual creation)
    const studentData = {
      ...req.body,
      sourceType: req.body.sourceType || 'manual'
    };
    const student = new Student(studentData);
    await student.save();
    res.status(201).json(student);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Roll number already exists' });
    }
    res.status(400).json({ error: error.message });
  }
});

// Update student
router.put('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Roll number already exists' });
    }
    res.status(400).json({ error: error.message });
  }
});

// Delete all students by batch (must come before /:id route)
router.delete('/batch/:batchName', async (req, res) => {
  try {
    const { batchName } = req.params;

    // Find all students in the batch
    const batchStudents = await Student.find({ batch: batchName }, '_id');
    const studentIds = batchStudents.map(s => s._id);

    if (studentIds.length === 0) {
      return res.status(404).json({ error: `No students found in batch: ${batchName}` });
    }

    // Count related data before deletion
    const [testResultsCount, visitsCount, backlogCount, topicStatusesCount] = await Promise.all([
      StudentTestResult.countDocuments({ studentId: { $in: studentIds } }),
      Visit.countDocuments({ studentId: { $in: studentIds } }),
      Backlog.countDocuments({ studentId: { $in: studentIds } }),
      StudentTopicStatus.countDocuments({ studentId: { $in: studentIds } })
    ]);

    // Delete all related data
    await Promise.all([
      StudentTestResult.deleteMany({ studentId: { $in: studentIds } }),
      Visit.deleteMany({ studentId: { $in: studentIds } }),
      Backlog.deleteMany({ studentId: { $in: studentIds } }),
      StudentTopicStatus.deleteMany({ studentId: { $in: studentIds } })
    ]);

    // Delete all students in the batch
    const studentsDeleted = await Student.deleteMany({ batch: batchName });

    res.json({ 
      message: `Successfully deleted ${studentsDeleted.deletedCount} student(s) from batch "${batchName}" and all related data`,
      deleted: {
        students: studentsDeleted.deletedCount,
        testResults: testResultsCount,
        visits: visitsCount,
        backlogItems: backlogCount,
        topicStatuses: topicStatusesCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete student and all related data
router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const studentId = student._id;

    // Count related data before deletion
    const [testResultsCount, visitsCount, backlogCount, topicStatusesCount] = await Promise.all([
      StudentTestResult.countDocuments({ studentId }),
      Visit.countDocuments({ studentId }),
      Backlog.countDocuments({ studentId }),
      StudentTopicStatus.countDocuments({ studentId })
    ]);

    // Delete all related data
    await Promise.all([
      StudentTestResult.deleteMany({ studentId }),
      Visit.deleteMany({ studentId }),
      Backlog.deleteMany({ studentId }),
      StudentTopicStatus.deleteMany({ studentId })
    ]);

    // Delete the student
    await Student.findByIdAndDelete(req.params.id);

    res.json({ 
      message: 'Student and all related data deleted successfully',
      deleted: {
        student: 1,
        testResults: testResultsCount,
        visits: visitsCount,
        backlogItems: backlogCount,
        topicStatuses: topicStatusesCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Batch delete students (delete multiple students by IDs)
router.post('/batch-delete', async (req, res) => {
  try {
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'studentIds array is required' });
    }

    // Validate all IDs exist
    const students = await Student.find({ _id: { $in: studentIds } });
    if (students.length !== studentIds.length) {
      return res.status(400).json({ error: 'Some student IDs are invalid' });
    }

    // Delete all related data for all students
    await Promise.all([
      StudentTestResult.deleteMany({ studentId: { $in: studentIds } }),
      Visit.deleteMany({ studentId: { $in: studentIds } }),
      Backlog.deleteMany({ studentId: { $in: studentIds } }),
      StudentTopicStatus.deleteMany({ studentId: { $in: studentIds } })
    ]);

    // Delete the students
    const deleteResult = await Student.deleteMany({ _id: { $in: studentIds } });

    res.json({ 
      message: `Successfully deleted ${deleteResult.deletedCount} student(s) and all related data`,
      deletedCount: deleteResult.deletedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete all students and all related data
router.delete('/', async (req, res) => {
  try {
    // Get all student IDs first
    const allStudents = await Student.find({}, '_id');
    const studentIds = allStudents.map(s => s._id);

    // Delete all related data
    const [testResultsDeleted, visitsDeleted, backlogDeleted, topicStatusesDeleted] = await Promise.all([
      StudentTestResult.deleteMany({}),
      Visit.deleteMany({}),
      Backlog.deleteMany({}),
      StudentTopicStatus.deleteMany({})
    ]);

    // Delete all students
    const studentsDeleted = await Student.deleteMany({});

    res.json({ 
      message: 'All students and related data deleted successfully',
      deleted: {
        students: studentsDeleted.deletedCount,
        testResults: testResultsDeleted.deletedCount,
        visits: visitsDeleted.deletedCount,
        backlogItems: backlogDeleted.deletedCount,
        topicStatuses: topicStatusesDeleted.deletedCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Migration endpoint: Set sourceType for students without it
// This sets missing sourceType to 'excel' by default (since that was the original behavior)
router.post('/migrate-source-type', async (req, res) => {
  try {
    const result = await Student.updateMany(
      { 
        $or: [
          { sourceType: { $exists: false } },
          { sourceType: null }
        ]
      },
      { 
        $set: { sourceType: 'excel' } 
      }
    );
    res.json({ 
      message: 'Migration completed',
      updated: result.modifiedCount 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

