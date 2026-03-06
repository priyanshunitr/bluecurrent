import db, { admin } from '../dbConfig.js';

const MOTORS_COLLECTION = 'motors';

/**
 * Background Scheduler Service
 *
 * Runs on a configurable interval and:
 *  1. Checks all motors for an expired motorTurnOffTime → turns them OFF
 *  2. Checks all motors' schedules for time-triggered events → turns them ON
 */

/**
 * Matches a schedule entry against the current system time.
 * @param {Object} schedule  - schedule document
 * @param {Date}   now
 * @returns {boolean}
 */
const matchesSchedule = (schedule, now) => {
    const currentH = now.getHours();
    const currentM = now.getMinutes();
    const currentDay = now.getDay();         // 0 = Sunday
    const currentDate = now.getDate();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (schedule.hour !== currentH || schedule.minute !== currentM) return false;

    if (schedule.type === 'everyday') return true;

    if (schedule.type === 'weekly' && schedule.day === currentDay) return true;

    if (schedule.type === 'particular') {
        const targetYear = schedule.year < 100 ? 2000 + schedule.year : schedule.year;
        return (
            schedule.date === currentDate &&
            schedule.month === currentMonth &&
            targetYear === currentYear
        );
    }

    return false;
};

/**
 * Processes one motor document: applies timer + schedule logic and returns
 * a Firestore update object (empty if no changes needed).
 *
 * @param {Object} data - motor document data
 * @param {Date}   now
 * @returns {{ updates: Object, changed: boolean }}
 */
const processMotor = (data, now) => {
    const updates = {};
    let changed = false;

    const schedules = data.schedules || [];
    let newMotorState = data.current_on;
    let newMotorTurnOffTime = data.motorTurnOffTime;
    let updatedSchedules = [...schedules];

    // 1. Check if active timer has expired
    const motorTurnOffTimeMillis = data.motorTurnOffTime && typeof data.motorTurnOffTime.toMillis === 'function'
        ? data.motorTurnOffTime.toMillis()
        : data.motorTurnOffTime;

    if (data.current_on === true && motorTurnOffTimeMillis && now.getTime() >= motorTurnOffTimeMillis) {
        console.log(`[Scheduler] Timer expired for motor "${data.hexcode}". Turning OFF.`);
        newMotorState = false;
        newMotorTurnOffTime = null;
        changed = true;
    }

    // 2. Check scheduled triggers
    for (let i = 0; i < schedules.length; i++) {
        const s = schedules[i];
        if (!matchesSchedule(s, now)) continue;

        console.log(`[Scheduler] Schedule "${s.id}" triggered for motor "${data.hexcode}". Turning ON.`);
        newMotorState = true;
        changed = true;

        if (s.duration && s.duration > 0) {
            newMotorTurnOffTime = admin.firestore.Timestamp.fromMillis(now.getTime() + s.duration * 60000);
        } else {
            newMotorTurnOffTime = null;
        }

        // Remove one-time 'particular' schedules after they fire
        if (s.type === 'particular') {
            updatedSchedules = updatedSchedules.filter((sch) => sch.id !== s.id);
        }
    }

    if (changed) {
        updates.current_on = newMotorState;
        updates.motorTurnOffTime = newMotorTurnOffTime;

        if (newMotorState === true) {
            updates.starttime = admin.firestore.Timestamp.fromDate(now);
        }
    }

    if (updatedSchedules.length !== schedules.length) {
        updates.schedules = updatedSchedules;
    }

    return { updates, changed: Object.keys(updates).length > 0 };
};

/**
 * Main scheduler tick — iterates over ALL motors and applies logic.
 */
export const runSchedulerTick = async () => {
    try {
        const snapshot = await db.collection(MOTORS_COLLECTION).get();
        if (snapshot.empty) return;

        const now = new Date();
        const batch = db.batch();
        let batchHasWrites = false;

        snapshot.forEach((doc) => {
            const data = { hexcode: doc.id, ...doc.data() };
            const { updates, changed } = processMotor(data, now);

            if (changed) {
                batch.update(doc.ref, updates);
                batchHasWrites = true;
            }
        });

        if (batchHasWrites) {
            await batch.commit();
        }
    } catch (error) {
        console.error('[Scheduler] Error during tick:', error.message);
    }
};

/**
 * Starts the background scheduler on a given interval.
 * @param {number} intervalMs - interval in milliseconds (default 30s)
 */
export const startScheduler = (intervalMs = 30000) => {
    console.log(`[Scheduler] Started. Interval: ${intervalMs / 1000}s`);
    setInterval(runSchedulerTick, intervalMs);
};
