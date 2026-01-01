const mongoose = require('mongoose');

const backlogItemSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  subject: {
    type: String,
    enum: ['Physics', 'Chemistry', 'Mathematics'],
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  subtopic: {
    type: String,
    default: ''
  },
  isStrong: {
    type: Boolean,
    default: false
  },
  isWeak: {
    type: Boolean,
    default: false
  },
  conceptClear: {
    type: Boolean,
    default: false
  },
  solvingDone: {
    type: Boolean,
    default: false
  },
  isBacklog: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
backlogItemSchema.index({ studentId: 1, subject: 1, topic: 1, subtopic: 1 });

module.exports = mongoose.model('Backlog', backlogItemSchema);

