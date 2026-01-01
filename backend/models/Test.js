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

module.exports = mongoose.model('Test', testSchema);

