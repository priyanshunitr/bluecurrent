/**
 * Firestore Collection: `users`
 * Document ID: username (unique, lowercase)
 *
 * Schema:
 * {
 *   username:  string  — unique identifier (also the document ID)
 *   password:  string  — bcrypt-hashed
 *   phone:     string  — user's phone number
 * }
 */

/**
 * Validates fields required for user registration.
 * Returns an error message string or null if valid.
 * @param {{ username: any, password: any, phone: any }} body
 * @returns {string|null}
 */
export const validateRegisterInput = ({ username, password, phone }) => {
    if (!username || typeof username !== 'string' || username.trim() === '') {
        return 'username is required and must be a non-empty string.';
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
        return 'password is required and must be at least 6 characters.';
    }
    if (!phone || typeof phone !== 'string' || phone.trim() === '') {
        return 'phone is required and must be a non-empty string.';
    }
    return null;
};

/**
 * Validates fields required for login.
 * @param {{ username: any, password: any }} body
 * @returns {string|null}
 */
export const validateLoginInput = ({ username, password }) => {
    if (!username || typeof username !== 'string') {
        return 'username is required.';
    }
    if (!password || typeof password !== 'string') {
        return 'password is required.';
    }
    return null;
};

/**
 * Validates fields required for changing password.
 * @param {{ oldPassword: any, newPassword: any }} body
 * @returns {string|null}
 */
export const validateChangePasswordInput = ({ oldPassword, newPassword }) => {
    if (!oldPassword || typeof oldPassword !== 'string') {
        return 'oldPassword is required.';
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return 'newPassword is required and must be at least 6 characters.';
    }
    if (oldPassword === newPassword) {
        return 'newPassword must be different from oldPassword.';
    }
    return null;
};

/**
 * Builds a clean user document for Firestore storage.
 * @param {string} username
 * @param {string} hashedPassword
 * @param {string} phone
 * @returns {Object}
 */
export const buildUserDocument = (username, hashedPassword, phone) => ({
    username: username.trim().toLowerCase(),
    password: hashedPassword,
    phone: phone.trim(),
});
