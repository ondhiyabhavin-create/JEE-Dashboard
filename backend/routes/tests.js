const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Test = require('../models/Test');
const { parseExcelFile } = require('../controllers/excelUpload');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'test-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Get all tests
router.get('/', async (req, res) => {
  try {
    const tests = await Test.find().sort({ testDate: -1 }).lean(); // Use lean() for better performance
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get test by ID
router.get('/:id', async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).lean(); // Use lean() for better performance
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    res.json(test);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create test
router.post('/', async (req, res) => {
  try {
    const test = new Test({
      testName: req.body.testName,
      testDate: req.body.testDate,
      maxMarks: req.body.maxMarks || 300
    });
    await test.save();
    res.status(201).json(test);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Upload Excel file - test info will be extracted from Excel (I1-I6)
router.post('/upload', upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse Excel file - test info will be extracted from cells I1-I6
    const results = await parseExcelFile(req.file.path, null);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      message: 'Excel file processed successfully',
      results,
      test: results.test || null // Include test info in response
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Excel upload error:', error);
    const statusCode = error.message.includes('Missing required columns') || error.message.includes('empty') ? 400 : 500;
    res.status(statusCode).json({ 
      error: error.message,
      details: error.message.includes('Found columns') ? error.message : undefined
    });
  }
});

// Update test
router.put('/:id', async (req, res) => {
  try {
    const test = await Test.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    res.json(test);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete test
router.delete('/:id', async (req, res) => {
  try {
    const test = await Test.findByIdAndDelete(req.params.id);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    res.json({ message: 'Test deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

