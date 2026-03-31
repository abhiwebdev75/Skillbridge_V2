import { createContext, useContext, useEffect, useState } from 'react';
import { connectSocket, disconnectSocket } from '../services/socket';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [mongoUser, setMongoUser]       = useState(null);
  const [loading, setLoading]           = useState(true);

  // Listen to Firebase auth state
 useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (user) => {
    setFirebaseUser(user);
    if (user) {
      await fetchMongoUser();
      // Socket connection happens after mongoUser loads
    } else {
      setMongoUser(null);
      disconnectSocket();
    }
    setLoading(false);
  });
  return unsub;
}, []);

useEffect(() => {
  if (mongoUser?.firebaseUid) {
    connectSocket(mongoUser.firebaseUid);
  }
}, [mongoUser?.firebaseUid]);

  const fetchMongoUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setMongoUser(res.data);
    } catch {
      setMongoUser(null);   // user exists in Firebase but not registered in MongoDB yet
    }
  };

  // Google Sign In
  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  // Email Sign In
  const loginWithEmail = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (err) {
      toast.error('Invalid email or password');
      throw err;
    }
  };

  // Email Sign Up
  const registerWithEmail = async (email, password, name) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      return result.user;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  // Register in MongoDB (called after Firebase signup with role selection)
  const registerInMongo = async (name, role, organization = '', designation = '') => {
    try {
      const res = await api.post('/auth/register', { name, role, organization, designation });
      setMongoUser(res.data.user);
      return res.data.user;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setMongoUser(null);
    setFirebaseUser(null);
  };

  const refreshUser = () => fetchMongoUser();

  return (
    <AuthContext.Provider value={{
      firebaseUser,
      mongoUser,
      loading,
      loginWithGoogle,
      loginWithEmail,
      registerWithEmail,
      registerInMongo,
      logout,
      refreshUser,
      isLoggedIn: !!firebaseUser,
      isRegistered: !!mongoUser,
      role: mongoUser?.role || null,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};