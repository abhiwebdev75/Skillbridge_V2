const mongoose = require('mongoose');

const dailyReportSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  studentId:   { type: String, required: true },       // firebaseUid
  studentName: { type: String, required: true },
  recruiterId: { type: String, required: true },

  reportDate: { type: Date, default: Date.now },
  dayNumber:  { type: Number, required: true },        // Day 1, Day 2, etc.

  summary:     { type: String, required: true },       // what they did today
  blockers:    { type: String, default: '' },          // issues faced
  planForTomorrow: { type: String, default: '' },
  filesUploaded:   [String],                           // Firebase Storage URLs

  recruiterFeedback: { type: String, default: '' },
  feedbackGivenAt:   { type: Date },

  status: {
    type: String,
    enum: ['submitted', 'reviewed', 'revision-requested'],
    default: 'submitted'
  }

}, { timestamps: true });

module.exports = mongoose.model('DailyReport', dailyReportSchema);