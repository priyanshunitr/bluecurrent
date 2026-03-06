import db, { admin } from '../dbConfig.js';

const MOTORS_COLLECTION = 'motors';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Fetches a motor document by hexcode.
 * Throws 404 if not found.
 * @param {string} hexcode
 * @returns {Promise<FirebaseFirestore.DocumentSnapshot>}
 */
const getMotorDoc = async (hexcode) => {
    const snapshot = await db.collection(MOTORS_COLLECTION).doc(hexcode).get();
    if (!snapshot.exists) {
        const err = new Error(`Motor with hexcode "${hexcode}" not found.`);
        err.statusCode = 404;
        throw err;
    }
    return snapshot;
};

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Links an unlinked motor to a user.
 * A motor can only be linked once (user_conn is immutable once set).
 *
 * @param {string} username  - authenticated user's username
 * @param {string} hexcode   - IoT device hexcode
 * @returns {Promise<{ hexcode: string, user_conn: string }>}
 */
export const linkMotor = async (username, hexcode) => {
    const snapshot = await getMotorDoc(hexcode);
    const data = snapshot.data();

    if (data.user_conn !== null && data.user_conn !== undefined) {
        const err = new Error(
            'This motor is already linked to a user and cannot be re-linked.'
        );
        err.statusCode = 409;
        throw err;
    }

    await db.collection(MOTORS_COLLECTION).doc(hexcode).update({ user_conn: username });

    return { hexcode, user_conn: username };
};

/**
 * Returns all motors linked to the given user.
 *
 * @param {string} username
 * @returns {Promise<Array<Object>>}
 */
export const getMotorsByUser = async (username) => {
    const snapshot = await db
        .collection(MOTORS_COLLECTION)
        .where('user_conn', '==', username)
        .get();

    return snapshot.docs.map((doc) => doc.data());
};

/**
 * Returns the status of a specific motor.
 * Validates that the motor belongs to the requesting user.
 *
 * @param {string} username
 * @param {string} hexcode
 * @returns {Promise<Object>}
 */
export const getMotorStatus = async (username, hexcode) => {
    const snapshot = await getMotorDoc(hexcode);
    const data = snapshot.data();

    if (data.user_conn !== username) {
        const err = new Error('You do not have access to this motor.');
        err.statusCode = 403;
        throw err;
    }

    const { gas_level, current_on, starttime, motorTurnOffTime, schedules } = data;
    return { hexcode, gas_level, current_on, starttime, motorTurnOffTime, schedules: schedules || [] };
};

/**
 * Updates a motor's gas_level (called by IoT device).
 *
 * @param {string} hexcode
 * @param {number} gas_level
 * @returns {Promise<void>}
 */
export const updateGasLevel = async (hexcode, gas_level) => {
    await getMotorDoc(hexcode); // validates existence
    await db.collection(MOTORS_COLLECTION).doc(hexcode).update({ gas_level });
};

/**
 * Fetches the current gas_level for a motor (one-time, ownership-checked).
 * Intended as the initial load before the SSE stream is opened.
 *
 * @param {string} username
 * @param {string} hexcode
 * @returns {Promise<{ hexcode: string, gas_level: number|null }>}
 */
export const getCurrentGasLevel = async (username, hexcode) => {
    const snapshot = await getMotorDoc(hexcode);
    const data = snapshot.data();

    if (data.user_conn !== username) {
        const err = new Error('You do not have access to this motor.');
        err.statusCode = 403;
        throw err;
    }

    return { hexcode, gas_level: data.gas_level ?? null };
};

/**
 * Sets up a Firestore real-time listener (onSnapshot) on a motor document.
 * Fires onData({ hexcode, gas_level, timestamp }) whenever gas_level changes.
 * Fires onError(err) on listener failure.
 *
 * The motor's ownership is validated BEFORE attaching the listener.
 * Call the returned unsubscribe() function to detach the listener (e.g. on SSE close).
 *
 * @param {string}   username
 * @param {string}   hexcode
 * @param {Function} onData   - called with { hexcode, gas_level, timestamp }
 * @param {Function} onError  - called with Error
 * @returns {Promise<Function>} unsubscribe  — call to stop listening
 */
export const subscribeToGasLevel = async (username, hexcode, onData, onError) => {
    // Validate ownership once before attaching the long-lived listener
    const snapshot = await getMotorDoc(hexcode);
    const data = snapshot.data();

    if (data.user_conn !== username) {
        const err = new Error('You do not have access to this motor.');
        err.statusCode = 403;
        throw err;
    }

    const docRef = db.collection(MOTORS_COLLECTION).doc(hexcode);
    let lastGasLevel = data.gas_level; // track previous value to suppress non-gas-level updates

    const unsubscribe = docRef.onSnapshot(
        (docSnapshot) => {
            if (!docSnapshot.exists) return;

            const newData = docSnapshot.data();
            const newGasLevel = newData.gas_level ?? null;

            // Only emit an event when gas_level actually changed
            if (newGasLevel !== lastGasLevel) {
                lastGasLevel = newGasLevel;
                onData({ hexcode, gas_level: newGasLevel, timestamp: admin.firestore.Timestamp.now() });
            }
        },
        (err) => {
            onError(err);
        }
    );

    return unsubscribe;
};

/**
 * Updates motor on/off state and starttime (called by IoT device).
 * If motor turns ON with a duration, schedules the auto-off timestamp.
 * If motor turns ON without a duration, clears any existing timer.
 * If motor turns OFF, records starttime as the last start time.
 *
 * @param {string} hexcode
 * @param {boolean} motor      - true = ON, false = OFF
 * @param {number} [duration]  - optional, auto-off duration in minutes
 * @returns {Promise<Object>}
 */
export const updateMotorState = async (hexcode, motor, duration) => {
    const snapshot = await getMotorDoc(hexcode);
    const data = snapshot.data();

    const nowMillis = Date.now();
    const updates = { current_on: motor };

    if (motor === true) {
        // Motor turning ON: record start time
        updates.starttime = admin.firestore.Timestamp.now();

        if (duration && duration > 0) {
            updates.motorTurnOffTime = admin.firestore.Timestamp.fromMillis(nowMillis + duration * 60000); // minutes → ms
        } else {
            updates.motorTurnOffTime = null; // no timer
        }
    } else {
        // Motor turning OFF: preserve starttime as the last-started timestamp
        updates.motorTurnOffTime = null;
        // starttime stays as-is (last recorded ON time)
    }

    await db.collection(MOTORS_COLLECTION).doc(hexcode).update(updates);

    return {
        hexcode,
        current_on: motor,
        starttime: motor ? updates.starttime : data.starttime,
        motorTurnOffTime: updates.motorTurnOffTime || null,
    };
};

/**
 * Returns the schedules for a specific motor (auth-gated, user must own motor).
 *
 * @param {string} username
 * @param {string} hexcode
 * @returns {Promise<Array>}
 */
export const getSchedules = async (username, hexcode) => {
    const snapshot = await getMotorDoc(hexcode);
    const data = snapshot.data();

    if (data.user_conn !== username) {
        const err = new Error('You do not have access to this motor.');
        err.statusCode = 403;
        throw err;
    }

    return data.schedules || [];
};

/**
 * Replaces the schedules array for a specific motor (auth-gated).
 *
 * @param {string} username
 * @param {string} hexcode
 * @param {Array} schedules
 * @returns {Promise<void>}
 */
export const updateSchedules = async (username, hexcode, schedules) => {
    const snapshot = await getMotorDoc(hexcode);
    const data = snapshot.data();

    if (data.user_conn !== username) {
        const err = new Error('You do not have access to this motor.');
        err.statusCode = 403;
        throw err;
    }

    await db.collection(MOTORS_COLLECTION).doc(hexcode).update({ schedules });
};
