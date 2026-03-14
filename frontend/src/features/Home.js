import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell } from 'lucide-react-native';
import { Image } from 'react-native';
import { useNavigate } from 'react-router-native';
import BottomNav from '../components/BottomNav';
import { fetchMyMotors } from '../services/api';
import { formatMotorTime } from '../utils/dateUtils';
import { createNotificationChannel, syncMotorNotifications, getNotificationHistory } from '../services/notificationService';
import NotificationModal from '../components/NotificationModal';

const LogoHeader = () => (
  <View style={styles.logoContainer}>
    <Image 
      source={require('../assets/Bluecurrentlogo.png')} 
      style={styles.logoImageInner}
      resizeMode="contain"
    />
    <Image 
      source={require('../assets/Logofont.png')} 
      style={styles.brandImage}
      resizeMode="contain"
    />
  </View>
);

const MotorCard = ({ name, status, time, isOnline, hexcode, onPress }) => (
  <TouchableOpacity 
    style={[
      styles.cardContainer, 
      { backgroundColor: status.includes("ON") ? '#002B00' : '#1E293B' }
    ]} 
    onPress={onPress}
  >
    <View style={styles.cardTopRow}>
      <View style={styles.infoCol}>
        <Text style={styles.cardTitle}>{name}</Text>
        <Text style={styles.hexText}>#{hexcode}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: isOnline ? '#B9F6CA' : '#FF8A80' }]}>
        <Text style={[styles.badgeText, { color: isOnline ? '#004D40' : '#D32F2F' }]}>
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </Text>
      </View>
    </View>

    <View style={styles.statusRow}>
      <View style={[styles.statusDot, { backgroundColor: status.includes("ON") ? '#00C853' : '#94A3B8' }]} />
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
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  const loadMotors = async () => {
    const data = await fetchMyMotors();
    setMotors(data);
    // Sync notifications with current motor states
    await syncMotorNotifications(data);
    await checkNotifications();
  };

  const checkNotifications = async () => {
    const history = await getNotificationHistory();
    setHasNewNotifications(history.some(n => !n.read));
  };

  useEffect(() => {
    // Create Android notification channel on first mount
    createNotificationChannel();
    loadMotors();
    checkNotifications();
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
          <LogoHeader />
          <TouchableOpacity 
            style={styles.bellButton} 
            onPress={() => {
              setShowNotifications(true);
              setHasNewNotifications(false);
            }}
          >
            <Bell color="#111827" size={20} />
            {hasNewNotifications && <View style={styles.notificationDot} />}
          </TouchableOpacity>
        </View>

        <NotificationModal 
          visible={showNotifications} 
          onClose={() => setShowNotifications(false)} 
        />

        {/* Scrollable List */}
        <ScrollView 
          style={styles.motorList} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0A203F" />
          }
        >
          {motors.length > 0 ? (
            motors.map((motor, index) => (
              <MotorCard
                key={motor.hexcode || index}
                name={motor.nickname || `Motor ${index + 1}`}
                status={motor.current_on ? "Turned ON" : "Turned OFF"}
                time={motor.starttime ? `since ${formatMotorTime(motor.starttime)}` : ""}
                isOnline={motor.isOnline}
                hexcode={motor.hexcode || "#A1A1A1"}
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
  logoBg: {
    width: 36,
    height: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logoImageInner: {
    width: 28,
    height: 28,
  },
  logoImage: {
    width: 24,
    height: 24,
  },
  brandImage: {
    height: 18,
    width: 140,
    marginLeft: 10,
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
    backgroundColor: '#af0303ff', 
  },
  motorList: {
    flex: 1,
    marginTop: 10,
  },
  cardContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  infoCol: {
    flex: 1,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  hexText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 10,
  },
  statusText: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '600',
  },
  footerContainer: {
    paddingVertical: 20,
  },
  addButton: {
    backgroundColor: '#0A203F',
    borderRadius: 12,
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
