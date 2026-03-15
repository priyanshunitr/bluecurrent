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
/**
 * Matches a schedule entry against the IST system time.
 */
const matchesSchedule = (schedule, now) => {
    // Force comparison in India Standard Time (GMT+5:30)
    const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const currentH = istDate.getHours();
    const currentM = istDate.getMinutes();
    const currentDay = istDate.getDay();
    const currentDate = istDate.getDate();
    const currentMonth = istDate.getMonth() + 1;
    const currentYear = istDate.getFullYear();

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
 * Processes one motor document
 */
const processMotor = (data, now) => {
    const updates = {};
    let changed = false;

    const schedules = data.schedules || [];
    let newMotorState = data.current_on;
    let newMotorTurnOffTime = data.motorTurnOffTime;
    let updatedSchedules = [...schedules];

    // 1. Check Timer Expiry
    const motorTurnOffTimeMillis = data.motorTurnOffTime && typeof data.motorTurnOffTime.toMillis === 'function'
        ? data.motorTurnOffTime.toMillis()
        : data.motorTurnOffTime;

    if (data.current_on === true && motorTurnOffTimeMillis && now.getTime() >= motorTurnOffTimeMillis) {
        console.log(`[Scheduler] Timer expired for "${data.hexcode}". Turning OFF.`);
        newMotorState = false;
        newMotorTurnOffTime = null;
        changed = true;
    }

    // 2. Check Scheduled Triggers
    for (let i = 0; i < schedules.length; i++) {
        const s = schedules[i];
        if (!matchesSchedule(s, now)) continue;

        // PREVENTION: Don't trigger if already ON and this schedule was likely the cause 
        // (Prevents pulsing every 30s during the same minute)
        if (data.current_on === true && data.lastTriggeredScheduleId === s.id) continue;

        // If motor is offline, don't turn it on — flag it as missed
        if (data.isOnline === false) {
            console.log(`[Scheduler] Motor "${data.hexcode}" is OFFLINE. Skipping schedule "${s.id}".`);
            updates.missedScheduleReason = `offline`;
            updates.lastTriggeredScheduleId = s.id;
            changed = true;

            if (s.type === 'particular') {
                updatedSchedules = updatedSchedules.filter((sch) => sch.id !== s.id);
            }
            continue;
        }

        console.log(`[Scheduler] Triggering "${s.id}" for "${data.hexcode}" at ${now.toISOString()}`);
        newMotorState = true;
        changed = true;
        updates.lastTriggeredScheduleId = s.id; // Mark this ID as triggered

        if (s.duration && s.duration > 0) {
            newMotorTurnOffTime = admin.firestore.Timestamp.fromMillis(now.getTime() + s.duration * 60000);
        } else {
            newMotorTurnOffTime = null;
        }

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
 * Main scheduler tick
 */
export const runSchedulerTick = async () => {
    try {
        const snapshot = await db.collection(MOTORS_COLLECTION).get();
        if (snapshot.empty) return;

        const now = new Date();
        const istStr = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
        console.log(`[Scheduler] Tick | IST: ${istStr} | UTC: ${now.toISOString()}`);

        const batch = db.batch();
        let batchHasWrites = false;

        snapshot.forEach((doc) => {
            const rawData = doc.data();
            // Compute isOnline from last_seen (same logic as motorService)
            const lastSeenMillis = rawData.last_seen && typeof rawData.last_seen.toMillis === 'function'
                ? rawData.last_seen.toMillis()
                : 0;
            const isOnline = lastSeenMillis > 0 && (now.getTime() - lastSeenMillis) < 60000;

            const data = { hexcode: doc.id, ...rawData, isOnline };
            const { updates, changed } = processMotor(data, now);

            if (changed) {
                batch.update(doc.ref, updates);
                batchHasWrites = true;
            }
        });

        if (batchHasWrites) await batch.commit();
    } catch (error) {
        console.error('[Scheduler] Error:', error.message);
    }
};

export const startScheduler = (intervalMs = 30000) => {
    console.log(`[Scheduler] Started (IST Aware). Interval: ${intervalMs / 1000}s`);
    setInterval(runSchedulerTick, intervalMs);
};
