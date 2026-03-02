import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AlarmForm({
  hour, setHour,
  minute, setMinute,
  type, setType,
  selectedDay, setSelectedDay,
  date, setDate,
  addSchedule
}) {
  return (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Schedule Alarm</Text>

      <View style={styles.inputRow}>
        <TextInput
          placeholder="Hr"
          style={styles.input}
          value={hour}
          onChangeText={setHour}
          keyboardType="numeric"
        />
        <TextInput
          placeholder="Min"
          style={styles.input}
          value={minute}
          onChangeText={setMinute}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.typeContainer}>
        {['everyday', 'weekly', 'particular'].map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setType(t)}
            style={[styles.typeBtn, type === t && styles.activeTypeBtn]}
          >
            <Text style={type === t ? styles.activeText : styles.btnText}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {type === 'weekly' && (
        <View style={styles.dayRow}>
          {DAYS.map((day, idx) => (
            <TouchableOpacity
              key={day}
              onPress={() => setSelectedDay(idx)}
              style={[styles.dayCircle, selectedDay === idx && styles.activeDayCircle]}
            >
              <Text style={selectedDay === idx ? styles.activeText : styles.dayText}>
                {day[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {type === 'particular' && (
        <View style={styles.inputRow}>
          <TextInput
            placeholder="DD"
            style={styles.dateInput}
            value={date.d}
            onChangeText={(v) => setDate({ ...date, d: v })}
            keyboardType="numeric"
          />
          <TextInput
            placeholder="MM"
            style={styles.dateInput}
            value={date.m}
            onChangeText={(v) => setDate({ ...date, m: v })}
            keyboardType="numeric"
          />
          <TextInput
            placeholder="YYYY"
            style={styles.yearInput}
            value={date.y}
            onChangeText={(v) => setDate({ ...date, y: v })}
            keyboardType="numeric"
          />
        </View>
      )}

      <TouchableOpacity style={styles.addBtn} onPress={addSchedule}>
        <Text style={styles.addBtnText}>Set Schedule</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    color: '#334155',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 15,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 12,
    width: 90,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
  },
  dateInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 10,
    width: 65,
    borderRadius: 8,
    textAlign: 'center',
  },
  yearInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 10,
    width: 100,
    borderRadius: 8,
    textAlign: 'center',
  },
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: 5,
  },
  typeBtn: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  activeTypeBtn: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  btnText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  activeText: { color: '#fff', fontWeight: 'bold' },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDayCircle: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  dayText: { fontSize: 13, color: '#64748b' },
  addBtn: {
    backgroundColor: '#10b981',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
