import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AlarmList({ schedules, removeSchedule }) {
  return (
    <View style={styles.list}>
      <Text style={styles.listTitle}>Active Schedules</Text>
      {schedules.length === 0 && <Text style={styles.emptyText}>No alarms set</Text>}
      {schedules.map((s) => (
        <View key={s.id} style={styles.item}>
          <View>
            <Text style={styles.itemTime}>
              {s.hour.toString().padStart(2, '0')}:{s.minute.toString().padStart(2, '0')}
            </Text>
            <Text style={styles.itemType}>
              {s.type === 'weekly' ? `Every ${DAYS[s.day]}` : 
               s.type === 'particular' ? `${s.date}/${s.month}/${s.year}` : 'Everyday'}
            </Text>
            {s.duration > 0 && (
              <Text style={styles.itemDuration}>
                Runs for: {s.duration} min
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={() => removeSchedule(s.id)}>
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 10,
    marginBottom: 40,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#334155',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 10,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 10,
    alignItems: 'center',
  },
  itemTime: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  itemType: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  itemDuration: {
    fontSize: 12,
    color: '#0ea5e9',
    marginTop: 2,
    fontWeight: '500',
  },
  removeText: {
    color: '#f43f5e',
    fontWeight: '700',
  },
});
