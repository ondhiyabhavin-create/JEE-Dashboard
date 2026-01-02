const mongoose = require('mongoose');

const questionRecordSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true,
    index: true
  },
  subject: {
    type: String,
    enum: ['Physics', 'Chemistry', 'Mathematics'],
    required: true
  },
  type: {
    type: String,
    enum: ['negative', 'unattempted'],
    required: true
  },
  questionNumber: {
    type: Number,
    required: true
  },
  subtopic: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicates
questionRecordSchema.index({ studentId: 1, testId: 1, subject: 1, type: 1, questionNumber: 1, subtopic: 1 }, { unique: true });

module.exports = mongoose.model('QuestionRecord', questionRecordSchema);

