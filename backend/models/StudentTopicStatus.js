const mongoose = require('mongoose');

const studentTopicStatusSchema = new mongoose.Schema({
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
  topicName: {
    type: String,
    required: true
  },
  subtopicName: {
    type: String,
    default: '' // Empty string for topic-level status, actual name for subtopic-level
  },
  status: {
    type: String,
    enum: ['Good', 'Medium', 'Bad'],
    default: null
  },
  theoryCompleted: {
    type: Boolean,
    default: false
  },
  solvingCompleted: {
    type: Boolean,
    default: false
  },
  negativeCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index to ensure unique status per student (topic or subtopic)
studentTopicStatusSchema.index({ studentId: 1, subject: 1, topicName: 1, subtopicName: 1 }, { unique: true });

module.exports = mongoose.model('StudentTopicStatus', studentTopicStatusSchema);

