const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  applicantId:    { type: String, required: true },     // firebaseUid
  applicantMongoId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  applicantName:  { type: String, required: true },
  recruiterId:    { type: String, required: true },     // firebaseUid of task poster

  coverNote:    { type: String, default: '' },
  resumeUrl:    { type: String, default: '' },
  portfolioUrl: { type: String, default: '' },
  skills:       [String],

  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
    default: 'pending'
  },

  recruiterNote: { type: String, default: '' },         // why accepted or rejected
  respondedAt:   { type: Date }

}, { timestamps: true });

applicationSchema.index({ taskId: 1, applicantId: 1 }, { unique: true }); // one application per task per user

module.exports = mongoose.model('Application', applicationSchema);