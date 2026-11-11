// Node CLI script to sync and map all portfolio files to Firebase
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = "AIzaSyBBo0x_8TDFXVf9GfJS4ep8EqZa1ygsNpU";
const PROJECT_ID = "harshiprotfolio";
const STORAGE_BUCKET = "harshiprotfolio.firebasestorage.app";

const email = process.argv[2];
const password = process.argv[3];

console.log("==========================================");
console.log("   Girish Portfolio - Firebase Sync Tool   ");
console.log("==========================================");
console.log("Firebase Project:", PROJECT_ID);
console.log("Storage Bucket: ", STORAGE_BUCKET);

// 1. Files to map
const publicDir = path.join(__dirname, 'public');
const imgDir = path.join(publicDir, 'img');

const filesToUpload = [
  { local: path.join(imgDir, 'profile.jpg'), storagePath: 'profile/profile.jpg', mime: 'image/jpeg' },
  { local: path.join(publicDir, 'Girish_T_Resume.pdf'), storagePath: 'documents/Girish_T_Resume.pdf', mime: 'application/pdf' },
  { local: path.join(imgDir, 'ecom1.jpg'), storagePath: 'projects/ecom1.jpg', mime: 'image/jpeg' },
  { local: path.join(imgDir, 'ecom2.jpg'), storagePath: 'projects/ecom2.jpg', mime: 'image/jpeg' },
  { local: path.join(imgDir, 'ecom3.jpg'), storagePath: 'projects/ecom3.jpg', mime: 'image/jpeg' },
  { local: path.join(imgDir, 'churn1.jpg'), storagePath: 'projects/churn1.jpg', mime: 'image/jpeg' },
  { local: path.join(imgDir, 'churn2.jpg'), storagePath: 'projects/churn2.jpg', mime: 'image/jpeg' },
  { local: path.join(imgDir, 'churn3.jpg'), storagePath: 'projects/churn3.jpg', mime: 'image/jpeg' },
  { local: path.join(imgDir, 'adidas1.jpg'), storagePath: 'projects/adidas1.jpg', mime: 'image/jpeg' },
  { local: path.join(imgDir, 'upi1.jpg'), storagePath: 'projects/upi1.jpg', mime: 'image/jpeg' },
  { local: path.join(imgDir, 'upi2.jpg'), storagePath: 'projects/upi2.jpg', mime: 'image/jpeg' },
  { local: path.join(imgDir, 'cin1.jpg'), storagePath: 'projects/cin1.jpg', mime: 'image/jpeg' },
  { local: path.join(imgDir, 'cin2.jpg'), storagePath: 'projects/cin2.jpg', mime: 'image/jpeg' },
  { local: path.join(imgDir, 'cin3.jpg'), storagePath: 'projects/cin3.jpg', mime: 'image/jpeg' }
];

// Check all files
let allExist = true;
for (const f of filesToUpload) {
  if (!fs.existsSync(f.local)) {
    console.error("Missing local file:", f.local);
    allExist = false;
  }
}

if (!allExist) {
  process.exit(1);
}

console.log("All 14 assets verified locally.");

// Build the Firebase URL mapping
const urlMap = {};
for (const f of filesToUpload) {
  const enc = encodeURIComponent(f.storagePath);
  urlMap[path.basename(f.local)] = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${enc}?alt=media`;
}

console.log("\nSample Generated Firebase URLs:");
console.log("  Profile: ", urlMap['profile.jpg']);
console.log("  Resume:  ", urlMap['Girish_T_Resume.pdf']);
console.log("  Project: ", urlMap['ecom1.jpg']);

if (!email || !password) {
  console.log("\n---------------------------------------------------------");
  console.log("ℹ️  NOTE: You can also sync directly from your browser:");
  console.log("   1. Open http://localhost:3000");
  console.log("   2. Click the footer 5 times to open Admin");
  console.log("   3. Log in and click '☁️ Upload Local Files & Sync to Firebase'");
  console.log("---------------------------------------------------------");
  console.log("\nOr run with credentials: node sync-to-firebase.mjs <admin_email> <password>");
} else {
  console.log(`\nAttempting login as ${email}…`);
  try {
    const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const authData = await authRes.json();
    if (authData.error) {
      throw new Error(authData.error.message);
    }
    const token = authData.idToken;
    console.log("Authenticated successfully with Firebase Auth!");

    // Upload files
    console.log("\nUploading files to Firebase Storage…");
    for (let i = 0; i < filesToUpload.length; i++) {
      const f = filesToUpload[i];
      const buffer = fs.readFileSync(f.local);
      const enc = encodeURIComponent(f.storagePath);
      const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o?uploadType=media&name=${enc}`;
      
      const upRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Firebase ' + token,
          'Content-Type': f.mime
        },
        body: buffer
      });

      if (!upRes.ok) {
        const errText = await upRes.text();
        console.warn(`  [!] Upload failed for ${f.storagePath}:`, errText);
      } else {
        console.log(`  [${i + 1}/${filesToUpload.length}] Uploaded ${f.storagePath}`);
      }
    }

  } catch(e) {
    console.error("Auth / Upload Error:", e.message);
  }
}
