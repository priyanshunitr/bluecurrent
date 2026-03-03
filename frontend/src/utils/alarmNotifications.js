import notifee, { TriggerType, RepeatFrequency, AndroidImportance } from '@notifee/react-native';

const CHANNEL_ID = 'bluecurrent-tasks';

// Create notification channel (required for Android)
async function ensureChannel() {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Scheduled Tasks',
    importance: AndroidImportance.HIGH, 
    sound: 'default',
  });
}

/**
 * Build the next trigger Date for a schedule.
 * Returns null if the schedule is in the past (for 'particular' type).
 */
function getNextTriggerDate(schedule) {
  const now = new Date();

  if (schedule.type === 'particular') {
    const targetYear = schedule.year < 100 ? 2000 + schedule.year : schedule.year;
    const target = new Date(targetYear, schedule.month - 1, schedule.date, schedule.hour, schedule.minute, 0);
    // If the date is already past, return null
    if (target <= now) return null;
    return target;
  }

  if (schedule.type === 'everyday') {
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), schedule.hour, schedule.minute, 0);
    // If today's time already passed, schedule for tomorrow
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }
    return target;
  }

  if (schedule.type === 'weekly') {
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), schedule.hour, schedule.minute, 0);
    const currentDay = now.getDay();
    let daysUntil = schedule.day - currentDay;
    if (daysUntil < 0) daysUntil += 7;
    if (daysUntil === 0 && target <= now) daysUntil = 7;
    target.setDate(target.getDate() + daysUntil);
    return target;
  }

  return null;
}

/**
 * Schedule a native notification for an alarm.
 * Uses the schedule's id as the notification id for easy cancellation.
 */
export async function scheduleNotification(schedule) {
  await ensureChannel();

  const triggerDate = getNextTriggerDate(schedule);
  if (!triggerDate) return; // Past particular-day alarm; don't schedule

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  let body = 'Executing scheduled task to turn on motor...';
  if (schedule.type === 'everyday') {
    body = 'Executing daily task: Turning on motor.';
  } else if (schedule.type === 'weekly') {
    body = `Weekly schedule (${DAYS[schedule.day]}): Turning on motor.`;
  } else if (schedule.type === 'particular') {
    body = `Task for ${schedule.date}/${schedule.month}/${schedule.year}: Turning on motor.`;
  }

  const trigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerDate.getTime(),
    alarmManager: {
      allowWhileIdle: true,
    },
  };

  // For everyday alarms, repeat daily
  if (schedule.type === 'everyday') {
    trigger.repeatFrequency = RepeatFrequency.DAILY;
  }

  // For weekly alarms, repeat weekly
  if (schedule.type === 'weekly') {
    trigger.repeatFrequency = RepeatFrequency.WEEKLY;
  }

  await notifee.createTriggerNotification(
    {
      id: String(schedule.id),
      title: '🔌 Motor Schedule',
      body: body,
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH, 
        pressAction: { id: 'default' },
        smallIcon: 'ic_launcher', // fallback icon 
      },
      data: {
        scheduleId: String(schedule.id),
        scheduleType: schedule.type,
      },
    },
    trigger,
  );
}

/**
 * Cancel a scheduled notification by schedule id.
 */
export async function cancelNotification(scheduleId) {
  try {
    await notifee.cancelNotification(String(scheduleId));
  } catch (e) {
    console.error('Failed to cancel notification:', e);
  }
}

/**
 * Re-schedule notifications for all active schedules.
 * Useful on app launch to ensure everything is registered with the OS.
 */
export async function rescheduleAllNotifications(schedules) {
  // Cancel all existing ones first, then re-create
  await notifee.cancelAllNotifications();
  for (const schedule of schedules) {
    await scheduleNotification(schedule);
  }
}
