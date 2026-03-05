import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Bell, Cpu, Star, CalendarDays, Calendar as CalendarIcon, ChevronRight } from 'lucide-react-native';
import { useNavigate, useParams } from 'react-router-native';
import Svg, { Path } from 'react-native-svg';
import BottomNav from '../components/BottomNav';

const CustomToggle = ({ isOn, onToggle }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onToggle}
    style={[styles.toggleTrack, { backgroundColor: isOn ? '#E5E7EB' : '#374151' }]}
  >
    <View style={[styles.toggleThumb, { backgroundColor: isOn ? '#16A34A' : '#9CA3AF', alignSelf: isOn ? 'flex-end' : 'flex-start' }]} />
  </TouchableOpacity>
);

const GasGauge = () => {
    // Basic SVG semi-circle for the gauge
    return (
        <View style={styles.gaugeContainer}>
            <Svg width="120" height="70" viewBox="0 0 120 70">
                {/* Background arc */}
                <Path
                    d="M 10 60 A 50 50 0 0 1 110 60"
                    fill="none"
                    stroke="#1E293B" // Dark grayish blue
                    strokeWidth="20"
                    strokeLinecap="flat"
                />
                {/* Foreground arc (simulate value) */}
                <Path
                    d="M 10 60 A 50 50 0 0 1 60 10" // Draws partially
                    fill="none"
                    stroke="#38BDF8" // Light blue
                    strokeWidth="20"
                    strokeLinecap="flat"
                />
            </Svg>
        </View>
    );
};

const ScheduleItem = ({ icon: Icon, title, subtitle, tasks }) => (
    <View style={styles.scheduleItem}>
        <View style={styles.scheduleIconWrapper}>
            <Icon color="#FFFFFF" size={24} />
        </View>
        <View style={styles.scheduleDetails}>
            <Text style={styles.scheduleTitle}>{title}</Text>
            <Text style={styles.scheduleSubtitle}>{subtitle}</Text>
        </View>
        <Text style={styles.scheduleTasks}>{tasks} tasks</Text>
    </View>
);

const MotorDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [motorOn, setMotorOn] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigate(-1)}>
              <Cpu color="#000" size={24} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Motor {id || '1'}</Text>
              <Text style={styles.headerSubtitle}>HEX F1F1F1</Text>
            </View>
            <TouchableOpacity style={styles.bellButton}>
              <Bell color="#111827" size={20} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Status Card */}
            <View style={styles.cardContainer}>
                <Text style={styles.cardTitle}>Motor {id || '1'}</Text>
                <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: motorOn ? '#16A34A' : '#6B7280' }]} />
                    <Text style={styles.statusText}>
                    {motorOn ? 'Turned ON since 20 min' : 'Turned OFF'}
                    </Text>
                </View>
                <Text style={styles.scheduledText}>Scheduled to be OFF at 6:30 AM</Text>
                
                <View style={styles.toggleWrapper}>
                    <CustomToggle isOn={motorOn} onToggle={() => setMotorOn(!motorOn)} />
                </View>
            </View>

            {/* Gas Content Card */}
            <View style={[styles.cardContainer, styles.gasCard]}>
                <View style={styles.gasTopRow}>
                    <View style={styles.gasGaugeWrapper}>
                        <GasGauge />
                    </View>
                    <View style={styles.gasTextWrapper}>
                        <Text style={styles.gasTitle}>GAS</Text>
                        <Text style={styles.gasValue}>1240</Text>
                    </View>
                </View>
                <Text style={styles.gasFooterText}>Gas is in the safe limit that is 1600</Text>
            </View>

            {/* Schedules Section */}
            <View style={styles.schedulesSection}>
                <View style={styles.schedulesHeader}>
                    <Text style={styles.schedulesSectionTitle}>Schedules</Text>
                    <Text style={styles.seeAllText}>See all</Text>
                </View>
                
                <ScheduleItem 
                    icon={Star} 
                    title="Onetime" 
                    subtitle="24 April 6:40 AM" 
                    tasks="1" 
                />
                <View style={styles.separator} />
                <ScheduleItem 
                    icon={CalendarIcon} 
                    title="Day Specific" 
                    subtitle="Tues 5:30 PM" 
                    tasks="1" 
                />
                <View style={styles.separator} />
                <ScheduleItem 
                    icon={CalendarDays} 
                    title="Everyday" 
                    subtitle="4:15 AM | 6:40 PM" 
                    tasks="2" 
                />
            </View>
            {/* Bottom Padding */}
            <View style={{height: 40}} />
        </ScrollView>
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
    paddingVertical: 20,
    marginTop: 10,
  },
  backButton: {
    backgroundColor: '#F3F4F6', // Light gray 
    padding: 10,
    borderRadius: 8,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
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
  scrollContent: {
    flex: 1,
  },
  cardContainer: {
    backgroundColor: '#050B1B', // VERY dark navy/black
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
    marginBottom: 6,
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
  scheduledText: {
    color: '#F8FAFC', // light white
    fontSize: 14,
    marginTop: 6,
    marginBottom: 16,
    fontWeight: '500', 
  },
  toggleWrapper: {
    marginTop: 8,
  },
  toggleTrack: {
    width: 140,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    padding: 4,
    // Add shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  toggleThumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  gasCard: {
    paddingVertical: 28,
  },
  gasTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gasGaugeWrapper: {
    flex: 1.5,
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gasTextWrapper: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  gasTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  gasValue: {
    color: '#9CA3AF',
    fontSize: 18,
    marginTop: 4,
  },
  gasFooterText: {
    color: '#16A34A', // green
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  schedulesSection: {
    marginTop: 10,
  },
  schedulesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  schedulesSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  seeAllText: {
    fontSize: 14,
    color: '#4B5563',
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  scheduleIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#050B1B', // Dark card color
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleDetails: {
    flex: 1,
    marginLeft: 16,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  scheduleSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  scheduleTasks: {
    fontSize: 12,
    color: '#6B7280',
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6', // very light grey line
    marginVertical: 4,
  }
});

export default MotorDetails;
