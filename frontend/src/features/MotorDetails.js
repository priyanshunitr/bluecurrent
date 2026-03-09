import React, { useState, useEffect } from 'react';
import { 
    Bell, Cpu, Star, CalendarDays, Calendar, 
    ChevronRight, Clock, Plus, Trash2 
} from 'lucide-react-native';
import { useNavigate, useParams } from 'react-router-native';
import Svg, { Path } from 'react-native-svg';
import BottomNav from '../components/BottomNav';
import { fetchMotorStatus, toggleMotorState, updateSchedules } from '../services/api';
import { formatMotorTime } from '../utils/dateUtils';
import { 
    View, Text, StyleSheet, SafeAreaView, TouchableOpacity, 
    ScrollView, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';

const CustomToggle = ({ isOn, onToggle, loading }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onToggle}
    disabled={loading}
    style={[styles.toggleTrack, { backgroundColor: isOn ? '#E5E7EB' : '#374151', opacity: loading ? 0.6 : 1 }]}
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
        <Text style={styles.scheduleTasks}>{tasks} {tasks === "1" ? "task" : "tasks"}</Text>
    </View>
);

const MotorDetails = () => {
  const navigate = useNavigate();
  const { id: hexcode } = useParams();
  const [activeTab, setActiveTab] = useState('Status'); // Status or Schedule
  const [motorData, setMotorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Schedule Form State
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [type, setType] = useState('everyday'); // everyday, weekly, particular
  const [duration, setDuration] = useState('');
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [date, setDate] = useState({ d: '', m: '', y: '' });

  const loadMotorData = async () => {
    const data = await fetchMotorStatus(hexcode);
    if (data) {
      setMotorData(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMotorData();
    // Poll for status updates every 10 seconds
    const interval = setInterval(loadMotorData, 10000);
    return () => clearInterval(interval);
  }, [hexcode]);

  const handleToggle = async () => {
      if (!motorData || actionLoading) return;
      
      const newState = !motorData.current_on;
      setActionLoading(true);

      // Optimistic Update
      setMotorData(prev => ({ ...prev, current_on: newState }));

      try {
          await toggleMotorState(hexcode, newState);
          // Refresh data to get new starttime/offtime
          await loadMotorData();
      } catch (error) {
          Alert.alert('Control Error', error.message);
          // Rollback
          setMotorData(prev => ({ ...prev, current_on: !newState }));
      } finally {
          setActionLoading(false);
      }
  };

  const addSchedule = async () => {
    const h = parseInt(hour);
    const m = parseInt(minute);

    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
        Alert.alert('Invalid Time', 'Please enter a valid hour (0-23) and minute (0-59)');
        return;
    }

    const newSchedule = {
        id: Date.now().toString(),
        hour: h,
        minute: m,
        type,
        day: type === 'weekly' ? selectedDay : 0,
        date: type === 'particular' ? parseInt(date.d) || 0 : 0,
        month: type === 'particular' ? parseInt(date.m) || 0 : 0,
        year: type === 'particular' ? parseInt(date.y) || 26 : 0,
        duration: parseInt(duration) || 0,
    };

    const updated = [...(motorData.schedules || []), newSchedule];
    setSaving(true);
    try {
        await updateSchedules(hexcode, updated);
        // Sync local state
        setMotorData(prev => ({ ...prev, schedules: updated }));
        // Clear form
        setHour(''); setMinute(''); setDuration('');
        Alert.alert('Success', 'Schedule added!');
    } catch (error) {
        Alert.alert('Error', error.message);
    } finally {
        setSaving(false);
    }
  };

  const deleteSchedule = async (id) => {
    const updated = motorData.schedules.filter(s => s.id !== id);
    try {
        await updateSchedules(hexcode, updated);
        setMotorData(prev => ({ ...prev, schedules: updated }));
    } catch (error) {
        Alert.alert('Error', 'Failed to delete schedule');
    }
  };

  if (loading) {
    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={[styles.container, styles.center]}>
                <Text style={styles.loadingText}>Loading motor status...</Text>
            </View>
        </SafeAreaView>
    );
  }

  if (!motorData) {
      return (
          <SafeAreaView style={styles.safeArea}>
              <View style={[styles.container, styles.center]}>
                  <Text style={styles.loadingText}>Motor not found.</Text>
                  <TouchableOpacity onPress={() => navigate(-1)}>
                      <Text style={{color: '#38BDF8', marginTop: 10}}>Go Back</Text>
                  </TouchableOpacity>
              </View>
          </SafeAreaView>
      );
  }

  const { current_on, starttime, hexcode: displayHex, gas_level, schedules, motorTurnOffTime } = motorData;

  // Helper to format schedule subtitle
  const getScheduleSubtitle = (s) => {
      if (s.type === 'everyday') return `${s.hour}:${s.minute.toString().padStart(2, '0')}`;
      if (s.type === 'weekly') {
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          return `${days[s.day]} ${s.hour}:${s.minute.toString().padStart(2, '0')}`;
      }
      return `${s.date}/${s.month} ${s.hour}:${s.minute.toString().padStart(2, '0')}`;
  };

  // Helper to get next scheduled off time text
  const getNextOffText = () => {
      if (motorTurnOffTime) {
          return `Scheduled to be OFF at ${formatMotorTime(motorTurnOffTime)}`;
      }
      return "No upcoming auto-off";
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigate(-1)}>
              <Cpu color="#000" size={24} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Motor Status</Text>
              <Text style={styles.headerSubtitle}>HEX {displayHex || 'Unknown'}</Text>
            </View>
            <TouchableOpacity style={styles.bellButton}>
              <Bell color="#111827" size={20} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Status Card */}
            <View style={styles.cardContainer}>
                <Text style={styles.cardTitle}>Motor Status</Text>
                <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: current_on ? '#16A34A' : '#6B7280' }]} />
                    <Text style={styles.statusText}>
                    {current_on ? `Turned ON since ${formatMotorTime(starttime)}` : 'Turned OFF'}
                    </Text>
                </View>
                {/* Dynamic scheduled text */}
                <Text style={styles.scheduledText}>{getNextOffText()}</Text>
                
                <View style={styles.toggleWrapper}>
                    <CustomToggle isOn={current_on} onToggle={handleToggle} loading={actionLoading} />
                </View>
            </View>

            {/* Tab Switched Content */}
            <View style={styles.tabContainer}>
                {['Status', 'Schedule'].map(tab => (
                    <TouchableOpacity 
                        key={tab} 
                        style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>{tab}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {activeTab === 'Status' ? (
                /* Gas Content Card */
                <View style={[styles.cardContainer, styles.gasCard]}>
                    <View style={styles.gasTopRow}>
                        <View style={styles.gasGaugeWrapper}>
                            <GasGauge />
                        </View>
                        <View style={styles.gasTextWrapper}>
                            <Text style={styles.gasTitle}>GAS</Text>
                            <Text style={styles.gasValue}>{gas_level ?? 'N/A'}</Text>
                        </View>
                    </View>
                    <Text style={styles.gasFooterText}>Gas is in the safe limit that is 1600</Text>
                </View>
            ) : (
                /* Schedule Section */
                <View style={styles.fullScheduleSection}>
                    {/* New Alarm Form */}
                    <View style={styles.formCard}>
                        <View style={styles.formHeader}>
                            <Bell color="#FFFFFF" size={20} />
                            <Text style={styles.formTitle}>New Alarm</Text>
                        </View>

                        <View style={styles.timeRow}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Hour</Text>
                                <TextInput 
                                    style={styles.timeInput}
                                    placeholder="08"
                                    placeholderTextColor="#94A3B8"
                                    value={hour}
                                    onChangeText={setHour}
                                    keyboardType="numeric"
                                    maxLength={2}
                                />
                            </View>
                            <Text style={styles.timeSeparator}>:</Text>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Min</Text>
                                <TextInput 
                                    style={styles.timeInput}
                                    placeholder="30"
                                    placeholderTextColor="#94A3B8"
                                    value={minute}
                                    onChangeText={setMinute}
                                    keyboardType="numeric"
                                    maxLength={2}
                                />
                            </View>
                            <View style={[styles.inputGroup, {marginLeft: 20, flex: 1.5}]}>
                                <Text style={styles.inputLabel}>Run (Min)</Text>
                                <TextInput 
                                    style={styles.durationInput}
                                    placeholder="Optional"
                                    placeholderTextColor="#94A3B8"
                                    value={duration}
                                    onChangeText={setDuration}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <View style={styles.typeSelector}>
                            {['everyday', 'weekly', 'particular'].map(t => (
                                <TouchableOpacity 
                                    key={t}
                                    style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                                    onPress={() => setType(t)}
                                >
                                    <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                                        {t.slice(0, 3).toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {type === 'particular' && (
                            <View style={styles.dateRow}>
                                <TextInput style={styles.dateInput} placeholder="DD" value={date.d} onChangeText={v => setDate({...date, d: v})} keyboardType="numeric" />
                                <TextInput style={styles.dateInput} placeholder="MM" value={date.m} onChangeText={v => setDate({...date, m: v})} keyboardType="numeric" />
                                <TextInput style={styles.dateInput} placeholder="YY" value={date.y} onChangeText={v => setDate({...date, y: v})} keyboardType="numeric" />
                            </View>
                        )}
                        
                        {type === 'weekly' && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                                    <TouchableOpacity 
                                        key={d} 
                                        style={[styles.dayBtn, selectedDay === i && styles.dayBtnActive]}
                                        onPress={() => setSelectedDay(i)}
                                    >
                                        <Text style={[styles.dayBtnText, selectedDay === i && styles.dayBtnTextActive]}>{d}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        <TouchableOpacity 
                            style={styles.addButton} 
                            onPress={addSchedule}
                            disabled={saving}
                        >
                            {saving ? <ActivityIndicator color="#050B1B" /> : (
                                <>
                                    <Plus color="#050B1B" size={20} />
                                    <Text style={styles.addButtonText}>Set Schedule</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Active List */}
                    <Text style={styles.subSectionTitle}>Active Schedules</Text>
                    {schedules && schedules.length > 0 ? (
                        schedules.map((s, index) => (
                            <View key={s.id || index} style={styles.scheduleRow}>
                                <View style={styles.scheduleIconBox}>
                                    {s.type === 'everyday' ? <Calendar color="#FFFFFF" size={18} /> : 
                                     s.type === 'weekly' ? <Clock color="#FFFFFF" size={18} /> : 
                                     <Star color="#FFFFFF" size={18} />}
                                </View>
                                <View style={styles.scheduleInfo}>
                                    <Text style={styles.scheduleTimeText}>
                                        {s.hour.toString().padStart(2, '0')}:{s.minute.toString().padStart(2, '0')}
                                    </Text>
                                    <Text style={styles.scheduleTypeText}>
                                        {s.type} {s.duration ? `• ${s.duration} min run` : ''}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => deleteSchedule(s.id)} style={styles.deleteBtn}>
                                    <Trash2 color="#EF4444" size={20} />
                                </TouchableOpacity>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>No schedules set yet</Text>
                    )}
                </View>
            )}
            {/* Bottom Padding */}
            <View style={{height: 40}} />
        </ScrollView>
      </View>
      <BottomNav />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, paddingHorizontal: 20, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, marginTop: 10 },
  backButton: { backgroundColor: '#F3F4F6', padding: 10, borderRadius: 8 },
  headerTitleContainer: { flex: 1, marginLeft: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  headerSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  bellButton: { backgroundColor: '#F8FAFC', padding: 10, borderRadius: 12, position: 'relative' },
  notificationDot: { position: 'absolute', top: 10, right: 12, width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  scrollContent: { flex: 1 },
  cardContainer: { backgroundColor: '#050B1B', borderRadius: 16, padding: 24, marginBottom: 16 },
  cardTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { color: '#9CA3AF', fontSize: 14 },
  scheduledText: { color: '#F8FAFC', fontSize: 14, marginTop: 6, marginBottom: 16, fontWeight: '500' },
  toggleWrapper: { marginTop: 8 },
  toggleTrack: { width: 140, height: 56, borderRadius: 28, justifyContent: 'center', padding: 4, elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
  toggleThumb: { width: 48, height: 48, borderRadius: 24 },
  gasCard: { paddingVertical: 28 },
  gasTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  gasGaugeWrapper: { flex: 1.5 },
  gaugeContainer: { alignItems: 'center', justifyContent: 'center' },
  gasTextWrapper: { flex: 1, alignItems: 'flex-start', justifyContent: 'center' },
  gasTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  gasValue: { color: '#9CA3AF', fontSize: 18, marginTop: 4 },
  gasFooterText: { color: '#16A34A', fontSize: 14, textAlign: 'center', fontWeight: '500' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#0F172A', fontSize: 16 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginVertical: 20 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabButtonActive: { backgroundColor: '#FFFFFF', elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2 },
  tabButtonText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  tabButtonTextActive: { color: '#0F172A' },
  fullScheduleSection: { marginBottom: 20 },
  formCard: { backgroundColor: '#050B1B', borderRadius: 24, padding: 24, marginBottom: 24 },
  formHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  formTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', marginLeft: 10 },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 },
  inputGroup: { flex: 1 },
  inputLabel: { color: '#94A3B8', fontSize: 12, marginBottom: 8, fontWeight: '500' },
  timeInput: { backgroundColor: '#1E293B', borderRadius: 12, height: 50, color: '#FFFFFF', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  timeSeparator: { color: '#94A3B8', fontSize: 28, marginHorizontal: 8, paddingBottom: 5 },
  durationInput: { backgroundColor: '#1E293B', borderRadius: 12, height: 50, color: '#FFFFFF', fontSize: 14, textAlign: 'center' },
  typeSelector: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 12, padding: 4, marginBottom: 20 },
  typeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  typeBtnActive: { backgroundColor: '#FFFFFF' },
  typeBtnText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  typeBtnTextActive: { color: '#050B1B' },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  dateInput: { backgroundColor: '#1E293B', borderRadius: 8, width: '30%', height: 40, color: '#FFFFFF', textAlign: 'center' },
  daySelector: { flexDirection: 'row', marginBottom: 20 },
  dayBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  dayBtnActive: { backgroundColor: '#FFFFFF' },
  dayBtnText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  dayBtnTextActive: { color: '#050B1B' },
  addButton: { backgroundColor: '#10B981', height: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: '#050B1B', fontSize: 15, fontWeight: '700', marginLeft: 8 },
  subSectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  scheduleIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#050B1B', alignItems: 'center', justifyContent: 'center' },
  scheduleInfo: { flex: 1, marginLeft: 16 },
  scheduleTimeText: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  scheduleTypeText: { fontSize: 12, color: '#64748B', textTransform: 'capitalize', marginTop: 2 },
  deleteBtn: { padding: 8 },
  emptyText: { color: '#94A3B8', textAlign: 'center', marginTop: 10, fontSize: 14 },
  // Compatibility styles for old components if any
  scheduleItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  scheduleIconWrapper: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#050B1B', alignItems: 'center', justifyContent: 'center' },
  scheduleDetails: { flex: 1, marginLeft: 16 },
  scheduleTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 4 },
  scheduleSubtitle: { fontSize: 12, color: '#6B7280' },
  scheduleTasks: { fontSize: 12, color: '#6B7280' },
  separator: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 4 },
});

export default MotorDetails;
