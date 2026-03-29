/* ===================================
   P&G — Firebase Configuration
   Real-time Firestore sync
   =================================== */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
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

// Initialize Firestore with persistence
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentSingleTabManager({ forceOwnership: true }),
    }),
  });
} catch (e) {
  // Already initialized (HMR in dev mode)
  db = getFirestore(app);
}

// Document reference for couple data
const COUPLE_DOC_ID = 'pedro-gabi';
const coupleRef = doc(db, 'couples', COUPLE_DOC_ID);

// === Save entire state to Firestore ===
export async function saveToFirestore(data) {
  try {
    const clean = JSON.parse(JSON.stringify(data));
    await setDoc(coupleRef, {
      ...clean,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore save:', err.message);
  }
}

// === Load state from Firestore (with timeout) ===
export async function loadFromFirestore() {
  try {
    const snapshot = await getDoc(coupleRef);
    if (snapshot.exists()) {
      return snapshot.data();
    }
  } catch (err) {
    console.warn('Firestore load:', err.message);
  }
  return null;
}

// === Listen for real-time changes ===
export function listenForChanges(callback) {
  try {
    return onSnapshot(coupleRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const source = snapshot.metadata.hasPendingWrites ? 'local' : 'server';
        callback(data, source);
      }
    }, (err) => {
      console.warn('Firestore listener:', err.message);
    });
  } catch (err) {
    console.warn('Firestore setup:', err.message);
    return () => {};
  }
}

export { db, coupleRef };
