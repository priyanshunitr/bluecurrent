import jwt from 'jsonwebtoken';

/**
 * Middleware: verifyToken
 * Validates the Authorization: Bearer <token> header.
 * On success, attaches req.user = { username } to the request.
 */
export const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { username: decoded.username };
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};
