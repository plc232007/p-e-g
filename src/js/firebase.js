/* ===================================
   P&G — Firebase Configuration
   Real-time Firestore sync
   =================================== */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  enableIndexedDbPersistence,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB98OrZZo49lVIon65QjPkc1uDEwKjLI0Q",
  authDomain: "p-e-g-74cb3.firebaseapp.com",
  projectId: "p-e-g-74cb3",
  storageBucket: "p-e-g-74cb3.firebasestorage.app",
  messagingSenderId: "792526974404",
  appId: "1:792526974404:web:dd9aad5fdc61315ffa4891",
  measurementId: "G-Q86EBL89Z4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Enable offline persistence
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firebase: Multiple tabs open, persistence only in one tab.');
    } else if (err.code === 'unimplemented') {
      console.warn('Firebase: Browser does not support persistence.');
    }
  });
} catch (e) {
  // Already enabled
}

// Document reference for couple data
const COUPLE_DOC_ID = 'pedro-gabi';
const coupleRef = doc(db, 'couples', COUPLE_DOC_ID);

// === Save entire state to Firestore ===
export async function saveToFirestore(data) {
  try {
    await setDoc(coupleRef, {
      ...data,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (err) {
    console.error('Firestore save error:', err);
  }
}

// === Load state from Firestore ===
export async function loadFromFirestore() {
  try {
    const snapshot = await getDoc(coupleRef);
    if (snapshot.exists()) {
      return snapshot.data();
    }
  } catch (err) {
    console.error('Firestore load error:', err);
  }
  return null;
}

// === Listen for real-time changes ===
export function listenForChanges(callback) {
  return onSnapshot(coupleRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      // Check if the change came from the network (not local)
      const source = snapshot.metadata.hasPendingWrites ? 'local' : 'server';
      callback(data, source);
    }
  }, (err) => {
    console.error('Firestore listener error:', err);
  });
}

export { db, coupleRef };
