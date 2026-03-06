import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
    validateRegisterInput,
    validateLoginInput,
    validateChangePasswordInput,
} from '../schemas/userSchema.js';
import {
    registerUser,
    loginUser,
    changePassword,
} from '../services/userService.js';

const router = Router();

// ─── POST /auth/register ─────────────────────────────────────────────────────
/**
 * Create a new user account.
 * Body: { username, password, phone }
 */
router.post('/register', async (req, res) => {
    const validationError = validateRegisterInput(req.body);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    try {
        const { username, password, phone } = req.body;
        const result = await registerUser(username, password, phone);
        return res.status(201).json({ message: 'User registered successfully.', user: result });
    } catch (err) {
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────
/**
 * Authenticate a user and return a JWT.
 * Body: { username, password }
 */
router.post('/login', async (req, res) => {
    const validationError = validateLoginInput(req.body);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    try {
        const { username, password } = req.body;
        const result = await loginUser(username, password);
        return res.status(200).json({ message: 'Login successful.', ...result });
    } catch (err) {
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
});

// ─── PUT /auth/change-password ─────────────────────────────────────────────
/**
 * Change the authenticated user's password.
 * Requires: Authorization: Bearer <token>
 * Body: { oldPassword, newPassword }
 */
router.put('/change-password', verifyToken, async (req, res) => {
    const validationError = validateChangePasswordInput(req.body);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    try {
        const { oldPassword, newPassword } = req.body;
        await changePassword(req.user.username, oldPassword, newPassword);
        return res.status(200).json({ message: 'Password updated successfully.' });
    } catch (err) {
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
});

export default router;
