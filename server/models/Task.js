const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, required: true },
  requiredSkills: [{ type: String, trim: true }],

  postedBy: {
    userId: { type: String, required: true },    // firebaseUid
    name:   { type: String, required: true },
    role:   { type: String, enum: ['recruiter', 'teacher'] },
    organization: String
  },

  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  compensation: {
    type: String,
    enum: ['paid', 'unpaid', 'certificate'],
    required: true
  },
  compensationAmount: { type: String, default: '' },  // e.g. "₹500" or "Free"

  maxApplicants:     { type: Number, default: 5 },
  deadline:          { type: Date, required: true },
  leadsToOpportunity:{ type: Boolean, default: false },   // shows badge on card

  status: {
    type: String,
    enum: ['open', 'in-progress', 'completed', 'closed'],
    default: 'open'
  },

  applicants: [{
    userId:    { type: String },                         // firebaseUid
    mongoId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name:      String,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    coverNote: String,
    appliedAt: { type: Date, default: Date.now }
  }],

  acceptedApplicant: {
    userId: String,
    name:   String
  },

  tags: [String],
  taskType: {
    type: String,
    enum: ['task', 'internship-project', 'assignment'],
    default: 'task'
  }

}, { timestamps: true });

// Index for fast search and filtering
taskSchema.index({ status: 1, requiredSkills: 1, difficulty: 1 });

module.exports = mongoose.model('Task', taskSchema);