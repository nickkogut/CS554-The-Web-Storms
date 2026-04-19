import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
if (!process.env.FIREBASE_SERVICE_ACCOUNT) throw "Missing FIREBASE_SERVICE_ACCOUNT environment variable. Make sure you have the latest .env";

let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (err) {
  throw "FIREBASE_SERVICE_ACCOUNT is malformed. Make sure you have the latest .env";
}

if (!admin.apps.length) { // Prevent duplicate inits
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;