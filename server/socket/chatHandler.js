const Chat       = require('../models/Chat');
const User       = require('../models/User');
const admin      = require('../config/firebase-admin');

module.exports = (io) => {

  // Track online users: { firebaseUid: socketId }
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // ── User comes online ──────────────────────────────────
    socket.on('user-online', ({ userId }) => {
      onlineUsers.set(userId, socket.id);
      socket.userId = userId;
      io.emit('online-users', Array.from(onlineUsers.keys()));
      console.log(`User online: ${userId}`);
    });

    // ── Join a task chat room ──────────────────────────────
    socket.on('join-room', async ({ roomId, userId }) => {
      socket.join(roomId);
      console.log(`${userId} joined room: ${roomId}`);

      // Send last 50 messages to the user who just joined
      try {
        const chat = await Chat.findOne({ roomId });
        if (chat) {
          socket.emit('room-history', chat.messages.slice(-50));
        } else {
          socket.emit('room-history', []);
        }
      } catch (err) {
        console.error('room-history error:', err.message);
      }
    });

    // ── Leave a room ───────────────────────────────────────
    socket.on('leave-room', ({ roomId }) => {
      socket.leave(roomId);
      console.log(`Left room: ${roomId}`);
    });

    // ── Send a chat message ────────────────────────────────
    socket.on('send-message', async ({ roomId, message }) => {
      try {
        const newMessage = {
          senderId:   message.senderId,
          senderName: message.senderName,
          text:       message.text || '',
          fileUrl:    message.fileUrl || '',
          fileName:   message.fileName || '',
          type:       message.type || 'text',
          timestamp:  new Date(),
          readBy:     [message.senderId],
        };

        // Save to MongoDB
        await Chat.findOneAndUpdate(
          { roomId },
          { $push: { messages: newMessage } },
          { upsert: true, new: true }
        );

        // Broadcast to everyone in the room
        io.to(roomId).emit('new-message', newMessage);

        // Push notification to offline users in this room
        const chat = await Chat.findOne({ roomId });
        if (chat) {
          for (const participant of chat.participants) {
            if (participant.userId !== message.senderId) {
              const isOnline = onlineUsers.has(participant.userId);
              if (!isOnline) {
                await sendPushNotification(
                  participant.userId,
                  `New message from ${message.senderName}`,
                  message.text || 'Sent a file'
                );
              }
            }
          }
        }
      } catch (err) {
        console.error('send-message error:', err.message);
        socket.emit('message-error', { error: 'Failed to send message' });
      }
    });

    // ── Mark messages as read ──────────────────────────────
    socket.on('mark-read', async ({ roomId, userId }) => {
      try {
        await Chat.updateOne(
          { roomId },
          { $addToSet: { 'messages.$[].readBy': userId } }
        );
        io.to(roomId).emit('messages-read', { userId });
      } catch (err) {
        console.error('mark-read error:', err.message);
      }
    });

    // ── Daily report submitted ─────────────────────────────
    socket.on('report-submitted', ({ roomId, report, studentName }) => {
      // Notify the recruiter in the room
      io.to(roomId).emit('new-report', {
        report,
        message: `${studentName} submitted Day ${report.dayNumber} report`,
        timestamp: new Date(),
      });
    });

    // ── Recruiter gives feedback on a report ───────────────
    socket.on('report-feedback', ({ roomId, feedback, recruiterName }) => {
      io.to(roomId).emit('feedback-received', {
        feedback,
        message: `${recruiterName} reviewed your report`,
        timestamp: new Date(),
      });
    });

    // ── Application accepted — open chat room ──────────────
    socket.on('application-accepted', async ({
      taskId, taskTitle,
      recruiterId, recruiterName,
      studentId,  studentName
    }) => {
      try {
        const roomId = `${taskId}_${studentId}`;

        // Create chat room in MongoDB if not exists
        const existing = await Chat.findOne({ roomId });
        if (!existing) {
          await Chat.create({
            roomId,
            taskId,
            taskTitle,
            participants: [
              { userId: recruiterId, name: recruiterName, role: 'recruiter' },
              { userId: studentId,   name: studentName,   role: 'student'   },
            ],
            messages: [{
              senderId:   'system',
              senderName: 'SkillBridge',
              text:       `🎉 Congratulations ${studentName}! Your application for "${taskTitle}" was accepted. You can now chat with ${recruiterName}.`,
              type:       'system',
              timestamp:  new Date(),
              readBy:     [],
            }],
            isActive: true,
          });
        }

        // Notify student if online
        const studentSocketId = onlineUsers.get(studentId);
        if (studentSocketId) {
          io.to(studentSocketId).emit('application-accepted-notify', {
            roomId,
            taskId,
            taskTitle,
            recruiterName,
            message: `Your application for "${taskTitle}" was accepted!`,
          });
        } else {
          // Push notification if offline
          await sendPushNotification(
            studentId,
            'Application Accepted!',
            `Your application for "${taskTitle}" was accepted by ${recruiterName}`
          );
        }

        socket.emit('room-created', { roomId });
      } catch (err) {
        console.error('application-accepted error:', err.message);
      }
    });

    // ── Task completed ─────────────────────────────────────
    socket.on('task-completed', async ({ roomId, taskTitle, studentId }) => {
      try {
        await Chat.findOneAndUpdate(
          { roomId },
          {
            $push: {
              messages: {
                senderId:   'system',
                senderName: 'SkillBridge',
                text:       `✅ Task "${taskTitle}" has been marked as completed. Awaiting recruiter review.`,
                type:       'system',
                timestamp:  new Date(),
                readBy:     [],
              }
            },
            isActive: false,
          }
        );
        io.to(roomId).emit('task-closed', {
          message: 'Task completed — chat is now read-only',
        });
      } catch (err) {
        console.error('task-completed error:', err.message);
      }
    });

    // ── Internship / Job offer sent ────────────────────────
    socket.on('offer-sent', async ({ studentId, offer }) => {
      const studentSocketId = onlineUsers.get(studentId);
      if (studentSocketId) {
        io.to(studentSocketId).emit('new-offer', {
          offer,
          message: `You have a new ${offer.type} offer from ${offer.from}!`,
        });
      } else {
        await sendPushNotification(
          studentId,
          `New ${offer.type} offer!`,
          `${offer.from} offered you a ${offer.type} opportunity`
        );
      }
    });

    // ── Typing indicators ──────────────────────────────────
    socket.on('typing',       ({ roomId, userName }) => {
      socket.to(roomId).emit('user-typing', { userName });
    });
    socket.on('stop-typing',  ({ roomId }) => {
      socket.to(roomId).emit('user-stop-typing');
    });

    // ── Disconnect ─────────────────────────────────────────
    socket.on('disconnect', () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit('online-users', Array.from(onlineUsers.keys()));
        console.log(`User offline: ${socket.userId}`);
      }
    });
  });

  // ── FCM Push Notification helper ───────────────────────────
  const sendPushNotification = async (userId, title, body) => {
    try {
      const user = await User.findOne({ firebaseUid: userId });
      if (!user?.fcmToken) return;

      await admin.messaging().send({
        token: user.fcmToken,
        notification: { title, body },
        data: { click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      });
    } catch (err) {
      console.error('FCM error:', err.message);
    }
  };
};