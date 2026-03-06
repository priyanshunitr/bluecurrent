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
  // Load the service account key JSON file
  const serviceAccount = require(serviceAccountPath);

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  db = admin.firestore();
  console.log(`Firebase initialized with credentials from ${serviceAccountPath}`);
} catch (error) {
  console.error(`Warning: Could not load ${serviceAccountPath} or initialize Firebase.`, error.message);
  db = null;
}

export { admin };
export default db;
