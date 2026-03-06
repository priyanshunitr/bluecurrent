import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawPath = process.env.FIREBASE_CREDENTIALS_PATH || './serviceAccountKey.json';
const serviceAccountPath = path.resolve(__dirname, rawPath);

let db;

try {
  let serviceAccount;

  // 1. Try to load from environment variable string (preferred for Render/Heroku)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (parseError) {
      console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT env variable as JSON.');
    }
  }

  // 2. Fallback: Load from file if env variable wasn't provided or failed to parse
  if (!serviceAccount) {
    const rawPath = process.env.FIREBASE_CREDENTIALS_PATH || './serviceAccountKey.json';
    const serviceAccountPath = path.resolve(__dirname, rawPath);
    serviceAccount = require(serviceAccountPath);
    console.log(`Firebase loading from file: ${serviceAccountPath}`);
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  db = admin.firestore();
  console.log('Firebase initialized successfully!');
} catch (error) {
  console.error('CRITICAL: Firebase initialization failed.', error.message);
  db = null;
}

export { admin };
export default db;
