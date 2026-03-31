const mongoose = require('mongoose');

const taskCompletionSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    unique: true
  },
  studentId:   { type: String, required: true },
  studentName: { type: String, required: true },
  recruiterId: { type: String, required: true },
  recruiterName: { type: String },

  workRating:     { type: Number, min: 1, max: 5 },
  recruiterReview:{ type: String, default: '' },

  decision: {
    type: String,
    enum: ['revision-requested', 'certificate', 'internship-offer', 'job-offer', 'pending'],
    default: 'pending'
  },

  offerDetails: {
    type:      { type: String, enum: ['internship', 'job'] },
    role:      String,
    duration:  String,           // e.g. "3 months"
    stipend:   String,           // e.g. "₹8000/month"
    startDate: Date,
    location:  String
  },

  certificateUrl: { type: String, default: '' },      // generated PDF URL

  studentResponse: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
  studentRespondedAt: Date,

  completedAt:  { type: Date, default: Date.now },

}, { timestamps: true });

module.exports = mongoose.model('TaskCompletion', taskCompletionSchema);