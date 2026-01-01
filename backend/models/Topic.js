const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  subject: {
    type: String,
    enum: ['Physics', 'Chemistry', 'Mathematics'],
    required: true
  },
  subtopics: [{
    name: {
      type: String,
      required: true,
      trim: true
    }
  }]
}, {
  timestamps: true
});

// Compound index to ensure unique topic names per subject
topicSchema.index({ name: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model('Topic', topicSchema);

