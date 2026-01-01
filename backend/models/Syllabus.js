const mongoose = require('mongoose');

const syllabusSchema = new mongoose.Schema({
  subject: {
    type: String,
    enum: ['Physics', 'Chemistry', 'Mathematics'],
    required: true
  },
  topics: [{
    name: {
      type: String,
      required: true
    },
    subtopics: [{
      type: String,
      required: true
    }]
  }],
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index to ensure unique subject
syllabusSchema.index({ subject: 1 }, { unique: true });

module.exports = mongoose.model('Syllabus', syllabusSchema);
