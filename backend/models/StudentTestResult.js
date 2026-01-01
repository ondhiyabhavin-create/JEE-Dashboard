const mongoose = require('mongoose');

const unattemptedQuestionSchema = new mongoose.Schema({
  questionNumber: {
    type: Number,
    required: true
  },
  subtopic: {
    type: String,
    default: ''
  }
});

const negativeQuestionSchema = new mongoose.Schema({
  questionNumber: {
    type: Number,
    required: true
  },
  subtopic: {
    type: String,
    default: ''
  }
});

const subjectResultSchema = new mongoose.Schema({
  right: {
    type: Number,
    default: 0
  },
  wrong: {
    type: Number,
    default: 0
  },
  unattempted: {
    type: Number,
    default: 0
  },
  score: {
    type: Number,
    default: 0
  },
  unattemptedQuestions: {
    type: [unattemptedQuestionSchema],
    default: []
  },
  negativeQuestions: {
    type: [negativeQuestionSchema],
    default: []
  }
});

const studentTestResultSchema = new mongoose.Schema({
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
  totals: {
    totalCorrect: {
      type: Number,
      default: 0
    },
    totalWrong: {
      type: Number,
      default: 0
    },
    totalUnattempted: {
      type: Number,
      default: 0
    },
    totalScore: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    rank: {
      type: Number,
      default: 0
    }
  },
  physics: {
    type: subjectResultSchema,
    default: {}
  },
  chemistry: {
    type: subjectResultSchema,
    default: {}
  },
  maths: {
    type: subjectResultSchema,
    default: {}
  },
  remarks: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Compound index to ensure one result per student per test
studentTestResultSchema.index({ studentId: 1, testId: 1 }, { unique: true });

module.exports = mongoose.model('StudentTestResult', studentTestResultSchema);

