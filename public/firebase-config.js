// Firebase integration for Girish Portfolio
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

// Official client config for harshiprotfolio
const defaultFirebaseConfig = {
  apiKey: "AIzaSyBBo0x_8TDFXVf9GfJS4ep8EqZa1ygsNpU",
  authDomain: "harshiprotfolio.firebaseapp.com",
  projectId: "harshiprotfolio",
  storageBucket: "harshiprotfolio.firebasestorage.app",
  messagingSenderId: "969369393521",
  appId: "1:969369393521:web:2a70acbabd1da2ce23bed0",
  measurementId: "G-LW07F18MYC"
};

// Use injected config if valid apiKey is present, otherwise use default config
const cfg = (window.__firebaseConfig && window.__firebaseConfig.apiKey && !window.__firebaseConfig.apiKey.includes('REPLACE'))
  ? window.__firebaseConfig
  : defaultFirebaseConfig;

let app, db, auth, storage;

try {
  app = getApps().length ? getApps()[0] : initializeApp(cfg);
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
} catch(e) {
  console.warn("Firebase initialization warning:", e);
}

const CONTENT_DOC = db ? doc(db, "portfolio", "content") : null;

// Expose on window.FB
window.FB = {
  app,
  db,
  auth,
  storage,

  // Real-time listener for content
  listenContent: (callback) => {
    if (!CONTENT_DOC) return () => {};
    try {
      return onSnapshot(CONTENT_DOC, (snap) => {
        if (snap && snap.exists()) {
          callback(snap.data());
        } else {
          callback(null);
        }
      }, (err) => {
        console.warn("Firestore snapshot notice (check security rules):", err.message);
      });
    } catch(err) {
      console.warn("listenContent error:", err);
      return () => {};
    }
  },

  // Save content to Firestore
  saveContent: async (data) => {
    if (!CONTENT_DOC) throw new Error("Firestore not initialized");
    const payload = JSON.parse(JSON.stringify(data));
    await setDoc(CONTENT_DOC, payload, { merge: true });
    return true;
  },

  // Auth helpers
  login: async (email, password) => {
    if (!auth) throw new Error("Firebase Auth not initialized");
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  },

  logout: async () => {
    if (auth) await signOut(auth);
  },

  onUserChanged: (cb) => {
    return auth ? onAuthStateChanged(auth, cb) : () => {};
  },

  getCurrentUser: () => {
    return auth ? auth.currentUser : null;
  },

  // Storage upload helper with fallback support
  uploadFile: async (fileOrBlob, pathPrefix = "uploads", customName = null) => {
    if (!storage) throw new Error("Firebase Storage not initialized");
    const rawName = customName || fileOrBlob.name || ("file_" + Date.now());
    const cleanName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileRef = ref(storage, `${pathPrefix}/${cleanName}`);
    const snapshot = await uploadBytes(fileRef, fileOrBlob);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  }
};
