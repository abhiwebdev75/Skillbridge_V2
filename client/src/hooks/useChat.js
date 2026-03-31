import { useState, useEffect, useRef, useCallback } from 'react';
import useSocket from './useSocket';
import { useAuth } from '../context/AuthContext';

const useChat = (roomId) => {
  const { socket }    = useSocket();
  const { mongoUser } = useAuth();
  const [messages, setMessages]   = useState([]);
  const [isTyping,  setIsTyping]  = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const typingTimer = useRef(null);

  useEffect(() => {
    if (!socket || !roomId) return;

    // Join the room
    socket.emit('join-room', {
      roomId,
      userId: mongoUser?.firebaseUid,
    });

    // Load history
    socket.on('room-history', (history) => {
      setMessages(history);
    });

    // New message arrives
    socket.on('new-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Typing indicators
    socket.on('user-typing', ({ userName }) => {
      setTypingUser(userName);
      setIsTyping(true);
    });
    socket.on('user-stop-typing', () => {
      setIsTyping(false);
      setTypingUser('');
    });

    // Mark messages as read
    socket.emit('mark-read', {
      roomId,
      userId: mongoUser?.firebaseUid,
    });

    return () => {
      socket.emit('leave-room', { roomId });
      socket.off('room-history');
      socket.off('new-message');
      socket.off('user-typing');
      socket.off('user-stop-typing');
    };
  }, [socket, roomId, mongoUser?.firebaseUid]);

  // Send a text message
  const sendMessage = useCallback((text) => {
    if (!socket || !text.trim()) return;

    socket.emit('send-message', {
      roomId,
      message: {
        senderId:   mongoUser?.firebaseUid,
        senderName: mongoUser?.name,
        text:       text.trim(),
        type:       'text',
      },
    });

    // Stop typing
    socket.emit('stop-typing', { roomId });
  }, [socket, roomId, mongoUser]);

  // Send a file message
  const sendFileMessage = useCallback((fileUrl, fileName) => {
    if (!socket || !fileUrl) return;

    socket.emit('send-message', {
      roomId,
      message: {
        senderId:   mongoUser?.firebaseUid,
        senderName: mongoUser?.name,
        fileUrl,
        fileName,
        text:       '',
        type:       'file',
      },
    });
  }, [socket, roomId, mongoUser]);

  // Typing indicator
  const handleTyping = useCallback(() => {
    if (!socket) return;

    socket.emit('typing', {
      roomId,
      userName: mongoUser?.name,
    });

    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('stop-typing', { roomId });
    }, 1500);
  }, [socket, roomId, mongoUser?.name]);

  return {
    messages,
    sendMessage,
    sendFileMessage,
    handleTyping,
    isTyping,
    typingUser,
  };
};

export default useChat;