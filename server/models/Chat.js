const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId:   { type: String, required: true },       // firebaseUid
  senderName: { type: String, required: true },
  text:       { type: String, default: '' },
  fileUrl:    { type: String, default: '' },
  fileName:   { type: String, default: '' },
  type: {
    type: String,
    enum: ['text', 'file', 'daily-report-ref', 'system'],
    default: 'text'
  },
  reportRef: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyReport' },
  timestamp: { type: Date, default: Date.now },
  readBy:    [String]                                 // array of firebaseUids
});

const chatSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },  // taskId_studentId
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  taskTitle:    String,
  participants: [{
    userId: String,
    name:   String,
    role:   String
  }],
  messages:  [messageSchema],
  isActive:  { type: Boolean, default: true },             // false after task closes
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });


module.exports = mongoose.model('Chat', chatSchema);