import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../dbConfig.js';
import { buildUserDocument } from '../schemas/userSchema.js';

const USERS_COLLECTION = 'users';
const SALT_ROUNDS = 12;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Retrieves a user document by username.
 * @param {string} username
 * @returns {Promise<FirebaseFirestore.DocumentSnapshot>}
 */
const getUserDoc = (username) =>
    db.collection(USERS_COLLECTION).doc(username.trim().toLowerCase()).get();

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Registers a new user.
 * Throws if the username is already taken.
 *
 * @param {string} username
 * @param {string} plainPassword
 * @param {string} phone
 * @returns {Promise<{ username: string }>}
 */
export const registerUser = async (username, plainPassword, phone) => {
    const normalizedUsername = username.trim().toLowerCase();
    const userRef = db.collection(USERS_COLLECTION).doc(normalizedUsername);

    const existing = await userRef.get();
    if (existing.exists) {
        const err = new Error('Username is already taken.');
        err.statusCode = 409;
        throw err;
    }

    const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    const userDoc = buildUserDocument(normalizedUsername, hashedPassword, phone);

    await userRef.set(userDoc);

    return { username: normalizedUsername };
};

/**
 * Authenticates a user and returns a signed JWT.
 * Throws if credentials are invalid.
 *
 * @param {string} username
 * @param {string} plainPassword
 * @returns {Promise<{ token: string, username: string }>}
 */
export const loginUser = async (username, plainPassword) => {
    const normalizedUsername = username.trim().toLowerCase();
    const snapshot = await getUserDoc(normalizedUsername);

    if (!snapshot.exists) {
        const err = new Error('Invalid username or password.');
        err.statusCode = 401;
        throw err;
    }

    const userData = snapshot.data();
    const passwordMatch = await bcrypt.compare(plainPassword, userData.password);

    if (!passwordMatch) {
        const err = new Error('Invalid username or password.');
        err.statusCode = 401;
        throw err;
    }

    const token = jwt.sign(
        { username: normalizedUsername },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    return { token, username: normalizedUsername };
};

/**
 * Changes the password for an authenticated user.
 * Verifies the old password before updating.
 *
 * @param {string} username          - from JWT (req.user.username)
 * @param {string} oldPassword
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
export const changePassword = async (username, oldPassword, newPassword) => {
    const snapshot = await getUserDoc(username);

    if (!snapshot.exists) {
        const err = new Error('User not found.');
        err.statusCode = 404;
        throw err;
    }

    const userData = snapshot.data();
    const passwordMatch = await bcrypt.compare(oldPassword, userData.password);

    if (!passwordMatch) {
        const err = new Error('Old password is incorrect.');
        err.statusCode = 401;
        throw err;
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.collection(USERS_COLLECTION).doc(username).update({ password: hashedPassword });
};
