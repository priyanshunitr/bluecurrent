import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Bell, Shield } from 'lucide-react-native';
import { useNavigate } from 'react-router-native';
import BottomNav from '../components/BottomNav';

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

  const handleMotorClick = (id) => {
    navigate(`/motor/${id}`);
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
        <ScrollView style={styles.motorList} showsVerticalScrollIndicator={false}>
          <MotorCard
            name="Motor 1"
            status="Turned ON"
            time="for 20 min"
            isOnline={true}
            onPress={() => handleMotorClick(1)}
          />
          <MotorCard
            name="Motor 1"
            status="Turned OFF"
            time="for last 3 days"
            isOnline={false}
            onPress={() => handleMotorClick(1)}
          />
           <MotorCard
            name="Motor 1"
            status="Turned ON"
            time="for 20 min"
            isOnline={true}
            onPress={() => handleMotorClick(1)}
          />
        </ScrollView>

        {/* Add Motor Button */}
        <View style={styles.footerContainer}>
          <TouchableOpacity style={styles.addButton}>
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
});

export default Home;
