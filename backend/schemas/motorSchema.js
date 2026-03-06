/**
 * Firestore Collection: `motors`
 * Document ID: hexcode (unique IoT device identifier, e.g. "0xABCD1234")
 *
 * Schema:
 * {
 *   hexcode:          string   — unique device identifier (also the document ID)
 *   gas_level:        number   — latest gas reading from IoT; null initially
 *   current_on:       boolean  — whether the motor is running; null initially
 *   starttime:        number   — Unix ms timestamp; stores when motor was last started
 *                                (if current_on=false: prev start; if current_on=true: current start)
 *                                null initially
 *   user_conn:        string   — username of linked user (FK → users.username); null initially
 *                                IMMUTABLE: once set, cannot be changed
 *   schedules:        Array    — list of scheduled on/off events; see Schedule sub-schema below
 *   motorTurnOffTime: number   — Unix ms timestamp when scheduler will auto-turn-off; null if no timer
 * }
 *
 * Schedule sub-schema (each item in `schedules`):
 * {
 *   id:       string   — unique identifier for the schedule
 *   type:     string   — 'everyday' | 'weekly' | 'particular'
 *   hour:     number   — 0–23
 *   minute:   number   — 0–59
 *   duration: number?  — auto-off duration in minutes (optional)
 *   day:      number?  — 0–6, required when type === 'weekly'
 *   date:     number?  — required when type === 'particular'
 *   month:    number?  — required when type === 'particular'
 *   year:     number?  — required when type === 'particular'
 * }
 */

/**
 * Builds the initial motor document when a device is registered.
 * All fields except hexcode start as null/empty.
 * @param {string} hexcode
 * @returns {Object}
 */
export const buildInitialMotorDocument = (hexcode) => ({
    hexcode,
    gas_level: null,
    current_on: null,
    starttime: null,
    user_conn: null,
    schedules: [],
    motorTurnOffTime: null,
});

/**
 * Validates the hexcode used to link a motor.
 * @param {{ hexcode: any }} body
 * @returns {string|null}
 */
export const validateLinkInput = ({ hexcode }) => {
    if (!hexcode || typeof hexcode !== 'string' || hexcode.trim() === '') {
        return 'hexcode is required and must be a non-empty string.';
    }
    return null;
};

/**
 * Validates the gas level update payload (from IoT device).
 * @param {{ gas_level: any }} body
 * @returns {string|null}
 */
export const validateGasUpdateInput = ({ gas_level }) => {
    if (gas_level === undefined || gas_level === null) {
        return 'gas_level is required.';
    }
    if (typeof gas_level !== 'number') {
        return 'gas_level must be a number.';
    }
    return null;
};

/**
 * Validates the motor on/off update payload (from IoT device).
 * @param {{ motor: any }} body
 * @returns {string|null}
 */
export const validateMotorUpdateInput = ({ motor }) => {
    if (motor === undefined || motor === null) {
        return 'motor (boolean) is required.';
    }
    if (typeof motor !== 'boolean') {
        return 'motor must be a boolean (true/false).';
    }
    return null;
};

/**
 * Validates a single schedule object.
 * @param {Object} schedule
 * @returns {string|null}
 */
export const validateSchedule = (schedule) => {
    if (!schedule.id || typeof schedule.id !== 'string') return 'Schedule id is required and must be a string.';
    if (!['everyday', 'weekly', 'particular'].includes(schedule.type)) return 'Invalid schedule type. Must be everyday, weekly, or particular.';
    if (typeof schedule.hour !== 'number' || schedule.hour < 0 || schedule.hour > 23) return 'hour must be a number between 0 and 23.';
    if (typeof schedule.minute !== 'number' || schedule.minute < 0 || schedule.minute > 59) return 'minute must be a number between 0 and 59.';
    if (schedule.duration !== undefined && (typeof schedule.duration !== 'number' || schedule.duration < 0)) return 'duration must be a non-negative number (minutes).';

    if (schedule.type === 'weekly') {
        if (typeof schedule.day !== 'number' || schedule.day < 0 || schedule.day > 6) {
            return 'day (0–6) is required for weekly schedules.';
        }
    }

    if (schedule.type === 'particular') {
        if (typeof schedule.date !== 'number') return 'date is required for particular schedules.';
        if (typeof schedule.month !== 'number') return 'month is required for particular schedules.';
        if (typeof schedule.year !== 'number') return 'year is required for particular schedules.';
    }

    return null;
};

/**
 * Validates an array of schedule objects.
 * @param {any} schedules
 * @returns {string|null}
 */
export const validateSchedulesInput = (schedules) => {
    if (!Array.isArray(schedules)) return 'schedules must be an array.';
    for (const s of schedules) {
        const error = validateSchedule(s);
        if (error) return error;
    }
    return null;
};
