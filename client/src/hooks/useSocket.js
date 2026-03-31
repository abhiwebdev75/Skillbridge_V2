import { useEffect, useRef, useState } from 'react';
import { connectSocket, getSocket, disconnectSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';

const useSocket = () => {
  const { mongoUser } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!mongoUser?.firebaseUid) return;

    const socket = connectSocket(mongoUser.firebaseUid);
    socketRef.current = socket;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    return () => {
      socket.off('connect');
      socket.off('disconnect');

      disconnectSocket(); // ✅ VERY IMPORTANT
    };
  }, [mongoUser?.firebaseUid]);

  return {
    socket: socketRef.current || getSocket(),
    isConnected,
  };
};

export default useSocket;