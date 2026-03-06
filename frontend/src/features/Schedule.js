import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Text,
  TouchableOpacity,
  TextInput,
} from 'react-native';

import ClockDisplay from '../components/Schedule/ClockDisplay';
import AlarmForm from '../components/Schedule/AlarmForm';
import AlarmList from '../components/Schedule/AlarmList';
import MotorControl from '../components/MotorControl';
import { LOCAL_HOST } from '@env';

export default function Schedule() {
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [type, setType] = useState('everyday');
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [date, setDate] = useState({ d: '', m: '', y: '' });
  const [schedules, setSchedules] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loaded, setLoaded] = useState(false);
  
  // Timer and Motor state
  const [duration, setDuration] = useState('');
  const [motorState, setMotorState] = useState(false);
  const [manualDuration, setManualDuration] = useState('');
  const [activeTurnOffTime, setActiveTurnOffTime] = useState(null);

  const fetchMotorStatus = useCallback(async () => {
    try {
      const res = await fetch(`${LOCAL_HOST}/status/motor`);
      const data = await res.json();
      setMotorState(data.motor);
      setActiveTurnOffTime(data.motorTurnOffTime);
    } catch (e) {
      console.log('Failed to fetch motor status', e);
    }
  }, []);

  // Load persisted schedules on mount & re-schedule native notifications
  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`${LOCAL_HOST}/get/schedules`);
        const data = await response.json();
        const saved = data.schedules || [];
        await fetchMotorStatus();
        
        // Filter out particular-day alarms that are already in the past
        const now = new Date();
        const activeSchedules = saved.filter((s) => {
          if (s.type === 'particular') {
            const targetYear = s.year < 100 ? 2000 + s.year : s.year;
            const target = new Date(targetYear, s.month - 1, s.date, s.hour, s.minute, 0);
            return target > now;
          }
          return true;
        });

        // If we filtered out any expired ones, sync with backend
        if (activeSchedules.length !== saved.length) {
          await fetch(`${LOCAL_HOST}/update/schedules`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schedules: activeSchedules }),
          });
        }

        setSchedules(activeSchedules);
        setLoaded(true);
      } catch (e) {
        console.error('Failed to load schedules from backend:', e);
        setLoaded(true);
      }
    })();
  }, []);

  // Heartbeat: Update clock and check for motor status periodically
  useEffect(() => {
    let tick = 0;
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      tick++;
      // Poll motor status from backend every 5 seconds
      if (tick % 5 === 0) {
        fetchMotorStatus();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchMotorStatus]);

  const addSchedule = useCallback(async () => {
    const h = parseInt(hour);
    const m = parseInt(minute);

    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      Alert.alert('Error', 'Please enter valid time (0-23 hr, 0-59 min)');
      return;
    }

    const newSchedule = {
      id: Date.now(),
      hour: h,
      minute: m,
      type: type,
      day: selectedDay,
      date: parseInt(date.d) || 0,
      month: parseInt(date.m) || 0,
      year: parseInt(date.y) || 0,
      duration: parseInt(duration) || 0,
    };

    const updated = [...schedules, newSchedule];
    setSchedules(updated);
    setHour('');
    setMinute('');
    setDuration('');

    // Persist to backend
    try {
      await fetch(`${LOCAL_HOST}/update/schedules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules: updated }),
      });
      Alert.alert('Success', 'Motor schedule set on server!');
    } catch (e) {
      console.error('Failed to sync schedule with backend:', e);
      Alert.alert('Error', 'Failed to save schedule to server.');
    }
  }, [hour, minute, type, selectedDay, date, schedules]);

  const removeSchedule = useCallback(async (id) => {
    const updated = schedules.filter((s) => s.id !== id);
    setSchedules(updated);

    // Persist to backend
    try {
      await fetch(`${LOCAL_HOST}/update/schedules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules: updated }),
      });
    } catch (e) {
      console.error('Failed to remove schedule from backend:', e);
    }
  }, [schedules]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <MotorControl />
      <ClockDisplay currentTime={currentTime} />
      
      <View style={styles.motorCard}>
        <Text style={styles.motorTitle}>Motor Control</Text>
        <Text style={styles.motorStatusText}>
          Status: <Text style={motorState ? styles.onText : styles.offText}>{motorState ? 'ON' : 'OFF'}</Text>
        </Text>
        
        {motorState && activeTurnOffTime && (
          <Text style={styles.timerInfo}>
            Auto Turn Off: {new Date(activeTurnOffTime).toLocaleTimeString()}
          </Text>
        )}

        {!motorState && (
          <TextInput 
            style={styles.manualDurationInput}
            placeholder="Duration (Minutes) - Optional"
            value={manualDuration}
            onChangeText={setManualDuration}
            keyboardType="numeric"
          />
        )}
        
        <TouchableOpacity 
          style={[styles.motorToggleBtn, motorState ? styles.btnStop : styles.btnStart]} 
          onPress={async () => {
            const desiredState = !motorState;
            const dur = desiredState && manualDuration ? parseInt(manualDuration) : 0;
            
            try {
              const res = await fetch(`${LOCAL_HOST}/update/motor`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ motor: desiredState, duration: dur }),
              });
              const data = await res.json();
              setMotorState(data.updated);
              setActiveTurnOffTime(data.motorTurnOffTime);
              if (!desiredState) setManualDuration('');
            } catch (e) {
              Alert.alert('Error', 'Failed to toggle motor');
            }
          }}
        >
          <Text style={styles.btnText}>{motorState ? 'Turn Motor OFF' : 'Turn Motor ON'}</Text>
        </TouchableOpacity>
      </View>

      <AlarmForm 
        hour={hour} setHour={setHour}
        minute={minute} setMinute={setMinute}
        type={type} setType={setType}
        selectedDay={selectedDay} setSelectedDay={setSelectedDay}
        date={date} setDate={setDate}
        duration={duration} setDuration={setDuration}
        addSchedule={addSchedule}
      />

      <AlarmList 
        schedules={schedules} 
        removeSchedule={removeSchedule} 
      />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    minHeight: '100%',
  },
  motorCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  motorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
  },
  motorStatusText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 15,
  },
  onText: { color: '#10b981', fontWeight: 'bold' },
  offText: { color: '#ef4444', fontWeight: 'bold' },
  timerInfo: {
    fontSize: 14,
    color: '#0284c7',
    marginBottom: 15,
    fontWeight: '600',
  },
  manualDurationInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 10,
    width: '80%',
    borderRadius: 8,
    textAlign: 'center',
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  motorToggleBtn: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
  },
  btnStart: { backgroundColor: '#3b82f6' },
  btnStop: { backgroundColor: '#ef4444' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
