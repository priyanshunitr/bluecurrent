import notifee, { AndroidImportance, AndroidColor, AuthorizationStatus } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatMotorTime } from '../utils/dateUtils';

const CHANNEL_ID = 'motor-status';
const NOTIFICATION_HISTORY_KEY = '@notification_history';

// Keep track of which motors currently have a displayed "ON" notification in this session
// Maps hexcode → nickname so we always have the name available for the OFF notification
const activeNotificationMap = new Map();

/**
 * Creates the notification channel and requests permission (Android 13+).
 */
export const createNotificationChannel = async () => {
    try {
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
 * Save a notification to the local history/cache.
 */
const saveToHistory = async (title, body, type = 'motor_on', hexcode) => {
    try {
        const historyJson = await AsyncStorage.getItem(NOTIFICATION_HISTORY_KEY);
        let history = historyJson ? JSON.parse(historyJson) : [];
        
        // Find most recent entry for this specific motor
        const lastEntry = history.find(n => n.hexcode === hexcode);
        
        // Avoid duplicate consecutive entries of same type (e.g. redundant ON logs)
        if (lastEntry && lastEntry.type === type) return;

        const newNotification = {
            id: Date.now().toString(),
            hexcode,
            title,
            body,
            timestamp: new Date().toISOString(),
            read: false,
            type
        };

        // Add to front, keep last 50
        history = [newNotification, ...history].slice(0, 50);
        await AsyncStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
        console.error('Failed to save notification history:', error);
    }
};

/**
 * Fetch notification history.
 */
export const getNotificationHistory = async () => {
    try {
        const historyJson = await AsyncStorage.getItem(NOTIFICATION_HISTORY_KEY);
        return historyJson ? JSON.parse(historyJson) : [];
    } catch (error) {
        console.error('Failed to fetch notification history:', error);
        return [];
    }
};

/**
 * Clear notification history.
 */
export const clearNotificationHistory = async () => {
    try {
        await AsyncStorage.removeItem(NOTIFICATION_HISTORY_KEY);
    } catch (error) {
        console.error('Failed to clear notification history:', error);
    }
};

/**
 * Mark all as read.
 */
export const markNotificationsAsRead = async () => {
    try {
        const historyJson = await AsyncStorage.getItem(NOTIFICATION_HISTORY_KEY);
        if (!historyJson) return;
        let history = JSON.parse(historyJson);
        history = history.map(n => ({ ...n, read: true }));
        await AsyncStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
        console.error('Failed to mark notifications as read:', error);
    }
};

/**
 * Show or update a persistent notification for a running motor.
 */
export const showMotorOnNotification = async (hexcode, nickname, starttime) => {
    try {
        const timeStr = formatMotorTime(starttime);
        const title = `${nickname} - ON`;
        const body = `The motor "${nickname}" was turned ON at ${timeStr}.`;

        // Log to history (the function itself handles deduplication)
        await saveToHistory(title, body, 'motor_on', hexcode);
        activeNotificationMap.set(hexcode, nickname);

        await notifee.displayNotification({
            id: `motor-on-${hexcode}`,
            title,
            body,
            android: {
                channelId: CHANNEL_ID,
                ongoing: true,
                autoCancel: false,
                smallIcon: 'ic_launcher',
                color: '#16A34A',
                pressAction: { id: 'default' },
                onlyAlertOnce: true,
            },
        });
    } catch (error) {
        console.warn('Failed to show notification:', error);
    }
};

/**
 * Cancel the notification for a motor that was turned OFF.
 */
export const cancelMotorOnNotification = async (hexcode, nickname = 'Motor') => {
    try {
        await notifee.cancelNotification(`motor-on-${hexcode}`);
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const title = `${nickname} - OFF`;
        const body = `The motor "${nickname}" was turned off at ${timeStr}.`;

        // Log to history (handles deduplication internally)
        await saveToHistory(title, body, 'motor_off', hexcode);

        // Show a brief push notification for the OFF event if it was previously ON
        if (activeNotificationMap.has(hexcode)) {
            await notifee.displayNotification({
                id: `motor-off-${hexcode}-${Date.now()}`,
                title,
                body,
                android: {
                    channelId: CHANNEL_ID,
                    smallIcon: 'ic_launcher',
                    color: '#EF4444',
                    pressAction: { id: 'default' },
                },
            });

            activeNotificationMap.delete(hexcode);
        }
    } catch (error) {
        console.warn('Failed to cancel notification:', error);
    }
};

/**
 * Sync notifications with the current list of motors.
 * 
 * @param {Array} motors – array of motor objects
 * @param {boolean} isPartialList - if true, won't cancel notifications for hexcodes not in this list
 */
export const syncMotorNotifications = async (motors, isPartialList = false) => {
    try {
        if (!motors || (motors.length === 0 && !isPartialList)) {
            const displayed = await notifee.getDisplayedNotifications();
            for (const n of displayed) {
                if (n.id && n.id.startsWith('motor-on-')) {
                    const hex = n.id.replace('motor-on-', '');
                    await cancelMotorOnNotification(hex, activeNotificationMap.get(hex) || 'Motor');
                }
            }
            return;
        }

        const currentOnHexcodes = new Set();
        const hexcodesInList = new Set(motors.map(m => m.hexcode));

        for (const motor of motors) {
            if (motor.current_on) {
                currentOnHexcodes.add(motor.hexcode);
                await showMotorOnNotification(
                    motor.hexcode,
                    motor.nickname || `Motor ${motor.hexcode}`,
                    motor.starttime,
                );
            }

            // Check if a schedule was missed because the motor was offline
            if (motor.missedScheduleReason === 'offline') {
                const nickname = motor.nickname || `Motor ${motor.hexcode}`;
                const title = `${nickname} - Schedule Missed`;
                const body = `"${nickname}" couldn't be turned ON because it is offline.`;

                await saveToHistory(title, body, 'missed_schedule', motor.hexcode);

                await notifee.displayNotification({
                    id: `missed-${motor.hexcode}-${Date.now()}`,
                    title,
                    body,
                    android: {
                        channelId: CHANNEL_ID,
                        smallIcon: 'ic_launcher',
                        color: '#EF4444',
                        pressAction: { id: 'default' },
                    },
                });

                // Clear the flag in Firestore so it doesn't repeat
                try {
                    const { clearMissedScheduleFlag } = require('./api');
                    await clearMissedScheduleFlag(motor.hexcode);
                } catch (e) {
                    console.warn('Could not clear missed schedule flag:', e);
                }
            }
        }

        // Handle motors that were turned off
        const displayed = await notifee.getDisplayedNotifications();
        for (const n of displayed) {
            if (n.id && n.id.startsWith('motor-on-')) {
                const hex = n.id.replace('motor-on-', '');
                
                // If it's a partial list and this motor isn't in it, don't touch its notification
                if (isPartialList && !hexcodesInList.has(hex)) continue;

                if (!currentOnHexcodes.has(hex)) {
                    // Try to find the nickname from the current motor list
                    const m = motors.find(mt => mt.hexcode === hex);
                    await cancelMotorOnNotification(hex, m?.nickname || activeNotificationMap.get(hex) || `Motor ${hex}`);
                }
            }
        }
    } catch (error) {
        console.warn('Failed to sync motor notifications:', error);
    }
};
