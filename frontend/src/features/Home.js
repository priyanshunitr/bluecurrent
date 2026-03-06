import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { Bell, Shield } from 'lucide-react-native';
import { useNavigate } from 'react-router-native';
import BottomNav from '../components/BottomNav';
import { fetchMyMotors } from '../services/api';
import { formatMotorTime } from '../utils/dateUtils';

const MotorCard = ({ name, status, time, isOnline, onPress }) => (
  <TouchableOpacity style={styles.cardContainer} onPress={onPress}>
    <Text style={styles.cardTitle}>{name}</Text>
    <View style={styles.statusRow}>
      <View style={[styles.statusDot, { backgroundColor: isOnline ? '#16A34A' : '#6B7280' }]} />
      <Text style={styles.statusText}>
        {status} {time}
      </Text>
    </View>
  </TouchableOpacity>
);

const Home = () => {
  const navigate = useNavigate();
  const [motors, setMotors] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadMotors = async () => {
    const data = await fetchMyMotors();
    setMotors(data);
  };

  useEffect(() => {
    loadMotors();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMotors();
    setRefreshing(false);
  };

  const handleMotorClick = (hexcode) => {
    navigate(`/motor/${hexcode}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Shield color="#0F172A" fill="#0F172A" size={28} />
            <Text style={styles.brandText}>BLUECURRENT</Text>
          </View>
          <TouchableOpacity style={styles.bellButton}>
            <Bell color="#111827" size={20} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* Scrollable List */}
        <ScrollView 
          style={styles.motorList} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#050B1B" />
          }
        >
          {motors.length > 0 ? (
            motors.map((motor, index) => (
              <MotorCard
                key={motor.hexcode || index}
                name={`Motor ${index + 1}`}
                status={motor.current_on ? "Turned ON" : "Turned OFF"}
                time={motor.starttime ? `since ${formatMotorTime(motor.starttime)}` : ""}
                isOnline={motor.current_on}
                onPress={() => handleMotorClick(motor.hexcode)}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No motors linked yet.</Text>
            </View>
          )}
        </ScrollView>

        {/* Add Motor Button */}
        <View style={styles.footerContainer}>
          <TouchableOpacity style={styles.addButton} onPress={() => navigate('/link-motor')}>
             <Text style={styles.addButtonText}>Add Motor</Text>
          </TouchableOpacity>
        </View>
      </View>
      <BottomNav />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    marginTop: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 10,
    letterSpacing: 1,
  },
  bellButton: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444', 
  },
  motorList: {
    flex: 1,
    marginTop: 10,
  },
  cardContainer: {
    backgroundColor: '#050B1B', // VERY dark navy
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  footerContainer: {
    paddingVertical: 20,
  },
  addButton: {
    backgroundColor: '#050B1B',
    borderRadius: 30, // Highly rounded
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
  }
});

export default Home;
