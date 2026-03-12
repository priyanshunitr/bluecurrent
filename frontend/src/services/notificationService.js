import notifee, { AndroidImportance, AndroidColor, AuthorizationStatus } from '@notifee/react-native';
import { formatMotorTime } from '../utils/dateUtils';

const CHANNEL_ID = 'motor-status';

/**
 * Creates the notification channel and requests permission (Android 13+).
 * Safe to call multiple times — Notifee will not duplicate.
 */
export const createNotificationChannel = async () => {
    try {
        // Request runtime permission (required on Android 13+ / API 33+)
        const settings = await notifee.requestPermission();
        if (settings.authorizationStatus === AuthorizationStatus.DENIED) {
            console.warn('Notification permission denied by user');
            return;
        }

        await notifee.createChannel({
            id: CHANNEL_ID,
            name: 'Motor Status',
            description: 'Shows when a motor is currently running',
            importance: AndroidImportance.HIGH,
            lights: true,
            lightColor: AndroidColor.GREEN,
            vibration: true,
        });
    } catch (error) {
        console.warn('Failed to create notification channel:', error);
    }
};

/**
 * Show or update a persistent notification for a running motor.
 *
 * @param {string} hexcode   – motor identifier (used as notification id)
 * @param {string} nickname  – human-readable motor name
 * @param {object} starttime – Firestore timestamp or JS date
 */
export const showMotorOnNotification = async (hexcode, nickname, starttime) => {
    try {
        const timeStr = formatMotorTime(starttime);

        await notifee.displayNotification({
            id: `motor-on-${hexcode}`,
            title: `⚡ ${nickname}`,
            body: `Turned ON since ${timeStr}`,
            android: {
                channelId: CHANNEL_ID,
                ongoing: true,
                autoCancel: false,
                smallIcon: 'ic_launcher',
                color: '#16A34A',
                pressAction: { id: 'default' },
                timestamp: Date.now(),
                showTimestamp: true,
            },
        });
    } catch (error) {
        console.warn('Failed to show notification:', error);
    }
};

/**
 * Cancel the notification for a motor that was turned OFF.
 *
 * @param {string} hexcode – motor identifier
 */
export const cancelMotorOnNotification = async (hexcode) => {
    try {
        await notifee.cancelNotification(`motor-on-${hexcode}`);
    } catch (error) {
        console.warn('Failed to cancel notification:', error);
    }
};

/**
 * Sync notifications with the current list of motors.
 * - Shows a notification for every motor that is ON.
 * - Cancels notifications for motors that are OFF or no longer exist.
 *
 * @param {Array} motors – array of motor objects from the API
 */
export const syncMotorNotifications = async (motors) => {
    try {
        if (!motors || motors.length === 0) {
            const displayed = await notifee.getDisplayedNotifications();
            for (const n of displayed) {
                if (n.id && n.id.startsWith('motor-on-')) {
                    await notifee.cancelNotification(n.id);
                }
            }
            return;
        }

        const onHexcodes = new Set();

        for (const motor of motors) {
            if (motor.current_on) {
                onHexcodes.add(motor.hexcode);
                await showMotorOnNotification(
                    motor.hexcode,
                    motor.nickname || 'Motor',
                    motor.starttime,
                );
            }
        }

        const displayed = await notifee.getDisplayedNotifications();
        for (const n of displayed) {
            if (n.id && n.id.startsWith('motor-on-')) {
                const hex = n.id.replace('motor-on-', '');
                if (!onHexcodes.has(hex)) {
                    await notifee.cancelNotification(n.id);
                }
            }
        }
    } catch (error) {
        console.warn('Failed to sync motor notifications:', error);
    }
};
