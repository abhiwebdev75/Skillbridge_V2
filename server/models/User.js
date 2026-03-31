const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true },
  name:        { type: String, required: true, trim: true },
  email:       { type: String, required: true, unique: true, lowercase: true },
  avatar:      { type: String, default: '' },         // Firebase Storage URL
  role: {
    type: String,
    enum: ['student', 'employee', 'recruiter', 'teacher'],
    required: true
  },

  // Student / Employee fields
  skills:          [String],
  resumeUrl:       { type: String, default: '' },     // Firebase Storage URL
  portfolioUrl:    { type: String, default: '' },
  bio:             { type: String, default: '' },
  certificates: [{
    taskId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    title:    String,
    issuedBy: String,
    issuedAt: { type: Date, default: Date.now }
  }],
  activeTasks:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  completedTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  offersPending: [{
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    type:   { type: String, enum: ['internship', 'job'] },
    from:   String,       // recruiter name
    offeredAt: Date
  }],

  // Recruiter / Teacher fields
  organization: { type: String, default: '' },
  designation:  { type: String, default: '' },
  postedTasks:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],

  fcmToken: { type: String, default: '' },    // for push notifications
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);