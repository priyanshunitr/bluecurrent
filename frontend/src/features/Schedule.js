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
import AlarmModal from '../components/Schedule/AlarmModal';

import { loadSchedules, saveSchedules } from '../utils/alarmStorage';
import { scheduleNotification, cancelNotification, rescheduleAllNotifications } from '../utils/alarmNotifications';

export default function Schedule() {
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [type, setType] = useState('everyday');
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [date, setDate] = useState({ d: '', m: '', y: '' });
  const [schedules, setSchedules] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [activeAlarm, setActiveAlarm] = useState(null);
  const [loaded, setLoaded] = useState(false);
  
  const triggeredAlarms = useRef(new Set());

  // Load persisted schedules on mount & re-schedule native notifications
  useEffect(() => {
    (async () => {
      const saved = await loadSchedules();
      
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

      // If we filtered out any expired ones, save the cleaned list
      if (activeSchedules.length !== saved.length) {
        await saveSchedules(activeSchedules);
      }

      setSchedules(activeSchedules);
      setLoaded(true);

      // Re-register all notifications with the OS
      await rescheduleAllNotifications(activeSchedules);
    })();
  }, []);

  // Heartbeat: Update clock and check for in-app alarms
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      const currentH = now.getHours();
      const currentM = now.getMinutes();
      const currentD = now.getDay();
      const currentMonth = now.getMonth() + 1;
      const currentDate = now.getDate();
      const currentYear = now.getFullYear();

      const timeKey = `${currentH}:${currentM}`;

      schedules.forEach((s) => {
        const alarmKey = `${s.id}-${timeKey}`;
        
        if (s.hour === currentH && s.minute === currentM && !triggeredAlarms.current.has(alarmKey)) {
          let trigger = false;
          
          if (s.type === 'everyday') trigger = true;
          if (s.type === 'weekly' && s.day === currentD) trigger = true;
          if (s.type === 'particular') {
            const targetYear = s.year < 100 ? 2000 + s.year : s.year;
            if (s.date === currentDate && s.month === currentMonth && targetYear === currentYear) {
              trigger = true;
            }
          }

          if (trigger) {
            triggeredAlarms.current.add(alarmKey);
            setActiveAlarm(s);
            setShowModal(true);
            
            console.log(`Schedule triggered for alarm ${alarmKey}, turning motor ON...`);
            
            fetch('http://10.0.2.2:3000/update/motor', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ motor: true }),
            })
              .then(res => res.json())
              .then(data => {
                console.log('Motor updated to true:', data);
              })
              .catch(err => {
                console.error('Error updating motor:', err);
                Alert.alert('Task Error', 'Failed to update motor.');
              });
          }
        }
      });

      if (currentM === 0 && now.getSeconds() === 0) {
        triggeredAlarms.current.clear();
      }
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

    // Persist to storage
    await saveSchedules(updated);

    // Schedule native notification
    await scheduleNotification(newSchedule);

    Alert.alert('Success', 'Motor schedule set!');
  }, [hour, minute, type, selectedDay, date, schedules]);

  const removeSchedule = useCallback(async (id) => {
    const updated = schedules.filter((s) => s.id !== id);
    setSchedules(updated);

    // Persist to storage
    await saveSchedules(updated);

    // Cancel the native notification
    await cancelNotification(id);
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

      <AlarmModal 
        showModal={showModal} 
        setShowModal={setShowModal} 
        activeAlarm={activeAlarm} 
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
