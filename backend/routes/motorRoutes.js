import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
    validateLinkInput,
    validateGasUpdateInput,
    validateMotorUpdateInput,
    validateSchedulesInput,
} from '../schemas/motorSchema.js';
import {
    linkMotor,
    unlinkMotor,
    getMotorsByUser,
    getMotorStatus,
    updateGasLevel,
    getCurrentGasLevel,
    subscribeToGasLevel,
    updateMotorState,
    getSchedules,
    updateSchedules,
    getDeviceStatus,
} from '../services/motorService.js';

const router = Router();

// ─── POST /motors/link ────────────────────────────────────────────────────────
/**
 * Link an unlinked motor (by hexcode) to the authenticated user.
 * A motor can only ever be linked once.
 * Requires: Authorization: Bearer <token>
 * Body: { hexcode }
 */
router.post('/link', verifyToken, async (req, res) => {
    const validationError = validateLinkInput(req.body);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    try {
        const { hexcode, nickname } = req.body;
        const result = await linkMotor(req.user.username, hexcode.trim(), nickname);
        return res.status(200).json({ message: 'Motor linked successfully.', motor: result });
    } catch (err) {
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
});

// ─── DELETE /motors/:hexcode/unlink ───────────────────────────────────────────
/**
 * Unlink a motor from the authenticated user.
 * Resets motor to unlinked state (clears user_conn, schedules, timer).
 * Requires: Authorization: Bearer <token>
 */
router.delete('/:hexcode/unlink', verifyToken, async (req, res) => {
    try {
        const result = await unlinkMotor(req.user.username, req.params.hexcode);
        return res.status(200).json(result);
    } catch (err) {
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
});

// ─── GET /motors/my ───────────────────────────────────────────────────────────
/**
 * Get all motors linked to the authenticated user.
 * Requires: Authorization: Bearer <token>
 */
router.get('/my', verifyToken, async (req, res) => {
    try {
        const motors = await getMotorsByUser(req.user.username);
        return res.status(200).json({ motors });
    } catch (err) {
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
});

// ─── GET /motors/:hexcode/status ──────────────────────────────────────────────
/**
 * Get the status of a specific motor owned by the authenticated user.
 * Returns: gas_level, current_on, starttime, motorTurnOffTime, schedules
 * Requires: Authorization: Bearer <token>
 */
router.get('/:hexcode/status', verifyToken, async (req, res) => {
    try {
        const status = await getMotorStatus(req.user.username, req.params.hexcode);
        return res.status(200).json(status);
    } catch (err) {
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
});

// ─── PUT /motors/:hexcode/gas ─────────────────────────────────────────────────
/**
 * IoT Device endpoint — update gas_level for a motor.
 * NO authentication required (device writes directly via hexcode).
 * Body: { gas_level: number }
 */
router.put('/:hexcode/gas', async (req, res) => {
    const validationError = validateGasUpdateInput(req.body);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    try {
        await updateGasLevel(req.params.hexcode, req.body.gas_level);
        return res.status(200).json({
            message: 'Gas level updated successfully.',
            hexcode: req.params.hexcode,
            gas_level: req.body.gas_level,
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
});

// ─── PUT /motors/:hexcode/motor ───────────────────────────────────────────────
/**
 * IoT Device endpoint — update motor on/off state.
 * NO authentication required (device writes directly via hexcode).
 * Body: { motor: boolean, duration?: number (minutes) }
 */
router.put('/:hexcode/motor', async (req, res) => {
    const validationError = validateMotorUpdateInput(req.body);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    try {
        const { motor, duration } = req.body;
        const result = await updateMotorState(req.params.hexcode, motor, duration);
        return res.status(200).json({ message: 'Motor state updated successfully.', ...result });
    } catch (err) {
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
});

// ─── GET /motors/:hexcode/device-status ─────────────────────────────────────────
/**
 * IoT Device endpoint — fetch current ON/OFF state and optional timer.
 * NO authentication required (device reads directly via hexcode).
 * Returns: { hexcode, current_on, motorTurnOffTime (millis or null) }
 */
router.get('/:hexcode/device-status', async (req, res) => {
    try {
        const result = await getDeviceStatus(req.params.hexcode);
        return res.status(200).json(result);
    } catch (err) {
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
});

// ─── GET /motors/:hexcode/schedules ───────────────────────────────────────────
/**
 * Get schedules for a motor owned by the authenticated user.
 * Requires: Authorization: Bearer <token>
 */
router.get('/:hexcode/schedules', verifyToken, async (req, res) => {
    try {
        const schedules = await getSchedules(req.user.username, req.params.hexcode);
        return res.status(200).json({ schedules });
    } catch (err) {
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
});

// ─── PUT /motors/:hexcode/schedules ───────────────────────────────────────────
/**
 * Update (replace) schedules for a motor owned by the authenticated user.
 * Requires: Authorization: Bearer <token>
 * Body: { schedules: Array }
 */
router.put('/:hexcode/schedules', verifyToken, async (req, res) => {
    const validationError = validateSchedulesInput(req.body.schedules);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    try {
        await updateSchedules(req.user.username, req.params.hexcode, req.body.schedules);
        return res.status(200).json({ message: 'Schedules updated successfully.' });
    } catch (err) {
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
});

// ─── GET /motors/:hexcode/gas ─────────────────────────────────────────────────
/**
 * One-time fetch of the current gas_level for a motor owned by the user.
 * Use this for the initial page load value before opening the SSE stream.
 * Requires: Authorization: Bearer <token>
 */
router.get('/:hexcode/gas', verifyToken, async (req, res) => {
    try {
        const result = await getCurrentGasLevel(req.user.username, req.params.hexcode);
        return res.status(200).json(result);
    } catch (err) {
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
});

// ─── GET /motors/:hexcode/gas/stream ─────────────────────────────────────────
/**
 * Server-Sent Events (SSE) endpoint.
 * Keeps a persistent HTTP connection open and pushes a JSON event every time
 * the gas_level field of this motor changes in Firestore.
 *
 * Events emitted:
 *   event: gas_update  →  data: { hexcode, gas_level, timestamp }
 *   event: error       →  data: { error: "message" }
 *   comment: :heartbeat  (every 25 s — keeps proxy connections alive)
 *
 * Requires: Authorization: Bearer <token>
 *
 * Frontend usage example:
 *   const es = new EventSource('/motors/0xABCD/gas/stream', {
 *     headers: { Authorization: 'Bearer <JWT>' },
 *   });
 *   es.addEventListener('gas_update', (e) => {
 *     const { gas_level } = JSON.parse(e.data);
 *   });
 */
router.get('/:hexcode/gas/stream', verifyToken, async (req, res) => {
    const { hexcode } = req.params;
    const username = req.user.username;

    // ── Set SSE headers before any async work ──────────────────────────────
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable Nginx buffering when proxied
    res.flushHeaders();

    let unsubscribe;
    let heartbeat;

    // ── Cleanup helper — called on disconnect or error ─────────────────────
    const cleanup = () => {
        if (heartbeat) clearInterval(heartbeat);
        if (unsubscribe) unsubscribe();
        res.end();
    };

    try {
        // Attach Firestore onSnapshot listener (also validates ownership)
        unsubscribe = await subscribeToGasLevel(
            username,
            hexcode,
            // ── onData: fired by Firestore when gas_level changes ──────────
            (payload) => {
                res.write(`event: gas_update\ndata: ${JSON.stringify(payload)}\n\n`);
            },
            // ── onError: Firestore listener error ─────────────────────────
            (err) => {
                res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
                cleanup();
            }
        );

        // Send a heartbeat comment every 25 s to keep the connection alive
        // through proxies and load balancers that close idle connections.
        heartbeat = setInterval(() => {
            res.write(':heartbeat\n\n');
        }, 25000);

    } catch (err) {
        // Could not attach listener (e.g. 403 Forbidden, 404 Not Found)
        res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
        cleanup();
        return;
    }

    // ── Detach listener + heartbeat when client closes the connection ──────
    req.on('close', cleanup);
});

export default router;
