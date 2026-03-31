import { db } from './firebase';
import {
  doc, setDoc, getDoc, updateDoc, onSnapshot, serverTimestamp
} from 'firebase/firestore';

// Create or update user document in Firestore (live profile data)
export const syncUserToFirestore = async (user) => {
  const ref = doc(db, 'users', user.firebaseUid || user.uid);
  await setDoc(ref, {
    name:         user.name,
    email:        user.email,
    role:         user.role,
    avatar:       user.avatar || '',
    activeTasks:  user.activeTasks || [],
    completedTasks: user.completedTasks || [],
    offersPending:  user.offersPending || [],
    certificates:   user.certificates || [],
    updatedAt: serverTimestamp()
  }, { merge: true });
};

// Get user doc from Firestore
export const getFirestoreUser = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
};

// Listen to live changes on a user document
export const subscribeToUser = (uid, callback) => {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    if (snap.exists()) callback(snap.data());
  });
};

// Update a single field on a Firestore user
export const updateFirestoreUser = async (uid, updates) => {
  await updateDoc(doc(db, 'users', uid), {
    ...updates,
    updatedAt: serverTimestamp()
  });
};