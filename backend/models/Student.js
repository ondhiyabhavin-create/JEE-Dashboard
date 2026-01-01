const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  rollNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  batch: {
    type: String,
    required: true
  },
  parentName: {
    type: String,
    default: ''
  },
  parentOccupation: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  contactNumber: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: ''
  },
  generalRemark: {
    type: String,
    default: ''
  },
  remarks: [{
    remark: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  sourceType: {
    type: String,
    enum: ['manual', 'excel'],
    default: 'excel',
    index: true
  },
  overallStatus: {
    type: String,
    enum: ['Good', 'Medium', 'Bad'],
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Student', studentSchema);

