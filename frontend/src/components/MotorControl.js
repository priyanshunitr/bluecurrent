import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { LOCAL_HOST } from '@env';

/**
 * MotorControl
 * ─────────────
 * Shows motor ON / OFF button.
 * When turning ON → asks for a duration → calls PUT /update/motor
 *   with { motor: true, durationSeconds }.
 * Backend timer auto-turns motor OFF when duration expires.
 * Polls GET /timer/status every second to show live countdown.
 */
export default function MotorControl() {
  const [motorOn, setMotorOn] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const pollRef = useRef(null);

  // ── On mount: sync motor + timer state from backend ─────────────────────
  useEffect(() => {
    syncStatus();
  }, []);

  const syncStatus = async () => {
    try {
      const [motorRes, timerRes] = await Promise.all([
        fetch(`${LOCAL_HOST}/status/motor`),
        fetch(`${LOCAL_HOST}/timer/status`),
      ]);
      const motorData = await motorRes.json();
      const timerData = await timerRes.json();

      setMotorOn(motorData.motor === true);
      setSecondsLeft(timerData.secondsLeft || 0);
    } catch (e) {
      console.warn('[MotorControl] syncStatus error:', e.message);
    }
  };

  // ── Polling: run every second while motor is ON ──────────────────────────
  useEffect(() => {
    if (motorOn) {
      pollRef.current = setInterval(pollTimer, 1000);
    } else {
      clearPoll();
      setSecondsLeft(0);
    }
    return () => clearPoll();
  }, [motorOn]);

  const clearPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const pollTimer = async () => {
    try {
      const res = await fetch(`${LOCAL_HOST}/timer/status`);
      const data = await res.json();
      const secs = data.secondsLeft || 0;
      setSecondsLeft(secs);

      // Only treat secondsLeft=0 as an expiry if a real timer was running.
      // If timerEndsAt is null it means "no timer set" — motor is just ON indefinitely.
      if (secs === 0 && data.timerEndsAt !== null && data.timerEndsAt !== undefined) {
        setMotorOn(false);
        Alert.alert('Motor OFF', 'Timer ended. Motor has been turned off automatically.');
      }
    } catch (e) {
      console.warn('[MotorControl] poll error:', e.message);
    }
  };

  // ── Ask for duration then turn motor ON ──────────────────────────────────
  const handleTurnOn = () => {
    if (Platform.OS === 'ios') {
      Alert.alert(
        'Turn Motor ON',
        'Choose an option:',
        [
          {
            text: 'No Timer (run until stopped)',
            onPress: () => turnMotorOn(0),
          },
          {
            text: 'Set Timer',
            onPress: () =>
              Alert.prompt(
                'Set Timer',
                'How long should the motor run? (hours)',
                (hourStr) => {
                  const hours = parseInt(hourStr) || 0;
                  Alert.prompt(
                    'Set Timer',
                    'Minutes?',
                    (minStr) => {
                      const mins = parseInt(minStr) || 0;
                      const totalSeconds = hours * 3600 + mins * 60;
                      turnMotorOn(totalSeconds);
                    },
                    'plain-text',
                    '0',
                    'numeric'
                  );
                },
                'plain-text',
                '0',
                'numeric'
              ),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      // Android
      Alert.alert(
        'Turn Motor ON',
        'Choose how long to run:',
        [
          { text: 'No Timer', onPress: () => turnMotorOn(0) },
          { text: '15 min',   onPress: () => turnMotorOn(15 * 60) },
          { text: '30 min',   onPress: () => turnMotorOn(30 * 60) },
          { text: '1 hour',   onPress: () => turnMotorOn(60 * 60) },
          { text: '2 hours',  onPress: () => turnMotorOn(120 * 60) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const turnMotorOn = async (durationSeconds) => {
    // durationSeconds === 0 means no timer (run until manually stopped)
    try {
      const res = await fetch(`${LOCAL_HOST}/update/motor`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          durationSeconds > 0
            ? { motor: true, durationSeconds }
            : { motor: true }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Error', data.message || 'Failed to turn motor ON.');
        return;
      }
      setMotorOn(true);
      setSecondsLeft(durationSeconds);
    } catch (e) {
      Alert.alert('Error', 'Could not reach the server.');
    }
  };

  // ── Turn motor OFF manually ───────────────────────────────────────────────
  const handleTurnOff = async () => {
    try {
      await fetch(`${LOCAL_HOST}/update/motor`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motor: false }),
      });
      setMotorOn(false);
      setSecondsLeft(0);
    } catch (e) {
      Alert.alert('Error', 'Could not reach the server.');
    }
  };

  // ── Format countdown ─────────────────────────────────────────────────────
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Motor</Text>

      <View style={[styles.statusBadge, motorOn ? styles.statusOn : styles.statusOff]}>
        <Text style={styles.statusText}>{motorOn ? 'ON' : 'OFF'}</Text>
      </View>

      {motorOn && secondsLeft > 0 && (
        <Text style={styles.countdown}>Auto-off in: {formatTime(secondsLeft)}</Text>
      )}

      <TouchableOpacity
        style={[styles.button, motorOn ? styles.offButton : styles.onButton]}
        onPress={motorOn ? handleTurnOff : handleTurnOn}
      >
        <Text style={styles.buttonText}>{motorOn ? 'Turn OFF' : 'Turn ON'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statusBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statusOn: {
    backgroundColor: '#4CAF50',
  },
  statusOff: {
    backgroundColor: '#ccc',
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  countdown: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  onButton: {
    backgroundColor: '#4CAF50',
  },
  offButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
