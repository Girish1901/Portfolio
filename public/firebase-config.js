// Firebase integration for Girish Portfolio
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
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

const firebaseConfig = {
  apiKey: "AIzaSyBBo0x_8TDFXVf9GfJS4ep8EqZa1ygsNpU",
  authDomain: "harshiprotfolio.firebaseapp.com",
  projectId: "harshiprotfolio",
  storageBucket: "harshiprotfolio.firebasestorage.app",
  messagingSenderId: "969369393521",
  appId: "1:969369393521:web:2a70acbabd1da2ce23bed0",
  measurementId: "G-LW07F18MYC"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

const CONTENT_DOC = doc(db, "portfolio", "content");

// Expose on window for easy interoperability
window.FB = {
  app,
  db,
  auth,
  storage,
  
  // Real-time listener for content
  listenContent: (callback) => {
    return onSnapshot(CONTENT_DOC, (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      } else {
        callback(null);
      }
    }, (err) => {
      console.warn("Firestore snapshot error (check security rules):", err);
    });
  },

  // Save content to Firestore
  saveContent: async (data) => {
    const payload = JSON.parse(JSON.stringify(data));
    await setDoc(CONTENT_DOC, payload, { merge: true });
    return true;
  },

  // Auth helpers
  login: async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  },

  logout: async () => {
    await signOut(auth);
  },

  onUserChanged: (cb) => {
    return onAuthStateChanged(auth, cb);
  },

  getCurrentUser: () => {
    return auth.currentUser;
  },

  // Storage upload helper for images or files (PDFs)
  uploadFile: async (fileOrBlob, pathPrefix = "uploads", customName = null) => {
    const rawName = customName || fileOrBlob.name || ("file_" + Date.now());
    const cleanName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileRef = ref(storage, `${pathPrefix}/${cleanName}`);
    const snapshot = await uploadBytes(fileRef, fileOrBlob);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  }
};
