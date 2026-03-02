import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ClockDisplay({ currentTime }) {
  const formatClock = (d) => {
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.clockContainer}>
      <Text style={styles.clockLabel}>Current Time</Text>
      <Text style={styles.clockText}>{formatClock(currentTime)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  clockContainer: {
    backgroundColor: '#f1f5f9',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  clockLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  clockText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0f172a',
  },
});
