import 'dotenv/config';
import db from './dbConfig.js';
import { buildInitialMotorDocument } from './schemas/motorSchema.js';

const registerNewMotor = async (hexcode) => {
    try {
        const motorData = buildInitialMotorDocument(hexcode);
        await db.collection('motors').doc(hexcode).set(motorData);
        console.log(`✅ Success: Motor "${hexcode}" registered in Firestore with correct structure.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error registering motor:', error);
        process.exit(1);
    }
};

const hex = process.argv[2] || 'A1A1A1';
registerNewMotor(hex);
