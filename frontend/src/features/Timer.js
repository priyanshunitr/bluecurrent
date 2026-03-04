import React, { useState, useEffect, useRef } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { LOCAL_HOST } from '@env';

export default function Timer() {
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('0');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const pollRef = useRef(null);

  // ── Poll backend for timer status ──────────────────────────────────────────
  const fetchTimerStatus = async () => {
    try {
      const res = await fetch(`${LOCAL_HOST}/timer/status`);
      const data = await res.json();
      const secs = data.secondsLeft || 0;

      if (secs > 0) {
        setSecondsLeft(secs);
        setIsActive(true);
      } else {
        // Timer finished on the backend
        if (isActive) {
          Alert.alert("Time's Up!", 'Motor has been turned OFF by the server.');
        }
        setSecondsLeft(0);
        setIsActive(false);
      }
    } catch (e) {
      console.error('[Timer] Poll error:', e.message);
    }
  };

  // On mount: check if a timer is already running (e.g. app restart)
  useEffect(() => {
    fetchTimerStatus();
  }, []);

  // Start / stop polling every second while a timer is expected to be active
  useEffect(() => {
    if (isActive) {
      pollRef.current = setInterval(fetchTimerStatus, 1000);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isActive]);

  // ── Start timer ────────────────────────────────────────────────────────────
  const startTimer = async () => {
    if (isActive) {
      // Pause: cancel on backend
      try {
        await fetch(`${LOCAL_HOST}/timer/cancel`, { method: 'POST' });
        setIsActive(false);
        setSecondsLeft(0);
      } catch (e) {
        Alert.alert('Error', 'Could not cancel timer on server.');
      }
      return;
    }

    const totalSeconds = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60;
    if (totalSeconds <= 0) {
      Alert.alert('Invalid', 'Please enter a time greater than 0.');
      return;
    }

    try {
      const res = await fetch(`${LOCAL_HOST}/timer/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationSeconds: totalSeconds }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Error', data.message || 'Failed to start timer.');
        return;
      }
      setSecondsLeft(totalSeconds);
      setIsActive(true);
    } catch (e) {
      Alert.alert('Error', 'Could not reach the server.');
    }
  };

  // ── Reset timer ────────────────────────────────────────────────────────────
  const resetTimer = async () => {
    try {
      await fetch(`${LOCAL_HOST}/timer/cancel`, { method: 'POST' });
    } catch (e) {
      console.warn('[Timer] Reset: server unreachable, resetting UI only.');
    }
    setIsActive(false);
    setSecondsLeft(0);
    setHours('0');
    setMinutes('0');
  };

  // ── Format helper ──────────────────────────────────────────────────────────
  const formatDisplay = () => {
    const h = Math.floor(secondsLeft / 3600);
    const m = Math.floor((secondsLeft % 3600) / 60);
    const s = secondsLeft % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {isActive || secondsLeft > 0 ? (
        <Text style={styles.timerText}>{formatDisplay()}</Text>
      ) : (
        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text>Hr</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={hours}
              onChangeText={setHours}
              placeholder="0"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text>Min</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={minutes}
              onChangeText={setMinutes}
              placeholder="0"
            />
          </View>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={startTimer}>
          <Text>{isActive ? 'Stop' : 'Start'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={resetTimer}>
          <Text>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 20,
  },
  inputGroup: {
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    width: 60,
    textAlign: 'center',
    borderRadius: 5,
    marginTop: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  button: {
    marginHorizontal: 10,
    padding: 10,
    backgroundColor: '#ddd',
    borderRadius: 5,
    minWidth: 80,
    alignItems: 'center',
  },
});
