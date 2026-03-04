import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';

import ClockDisplay from '../components/Schedule/ClockDisplay';
import AlarmForm from '../components/Schedule/AlarmForm';
import AlarmList from '../components/Schedule/AlarmList';
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

  // Load persisted schedules on mount & re-schedule native notifications
  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`${LOCAL_HOST}/get/schedules`);
        const data = await response.json();
        const saved = data.schedules || [];
        
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

  // Heartbeat: Update clock and check for in-app UI alerts
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      const currentH = now.getHours();
      const currentM = now.getMinutes();
    }, 1000);

    return () => clearInterval(interval);
  }, [schedules]);

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
    };

    const updated = [...schedules, newSchedule];
    setSchedules(updated);
    setHour('');
    setMinute('');

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
      <ClockDisplay currentTime={currentTime} />
      
      <AlarmForm 
        hour={hour} setHour={setHour}
        minute={minute} setMinute={setMinute}
        type={type} setType={setType}
        selectedDay={selectedDay} setSelectedDay={setSelectedDay}
        date={date} setDate={setDate}
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
});
