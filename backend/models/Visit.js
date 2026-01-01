const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  visitDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  visitTime: {
    type: String, // Store time as "HH:MM" format
    default: '10:00'
  },
  assignment: {
    type: String,
    default: ''
  },
  remarks: {
    type: String,
    default: ''
  },
  notified24h: {
    type: Boolean,
    default: false
  },
  notified6h: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient querying of upcoming visits
visitSchema.index({ visitDate: 1, notified24h: 1, notified6h: 1 });

module.exports = mongoose.model('Visit', visitSchema);

