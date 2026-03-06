import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import userRoutes from './routes/userRoutes.js';
import motorRoutes from './routes/motorRoutes.js';
import { startScheduler } from './services/schedulerService.js';

const app = express();
const PORT = process.env.PORT || 3000;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'bluecurrent_secret_key_123';

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ message: 'BlueCurrent API is running.' });
});

app.use('/auth', userRoutes);
app.use('/motors', motorRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ─── Start Server + Scheduler ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startScheduler(30000); // tick every 30 seconds
});
