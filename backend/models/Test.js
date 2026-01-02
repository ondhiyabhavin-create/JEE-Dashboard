const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  testName: {
    type: String,
    required: true
  },
  testDate: {
    type: Date,
    required: true
  },
  maxMarks: {
    type: Number,
    default: 300
  }
}, {
  timestamps: true
});

// Add index for faster queries
testSchema.index({ testDate: -1 }); // Index for sorting by date

module.exports = mongoose.model('Test', testSchema);

