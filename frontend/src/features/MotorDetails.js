import React, { useState, useEffect } from 'react';
import { 
    Bell, Cpu, Star, CalendarDays, Calendar, 
    ChevronRight, ChevronLeft, Clock, Plus, Trash2, Unlink2 
} from 'lucide-react-native';
import { useNavigate, useParams } from 'react-router-native';
import Svg, { Path } from 'react-native-svg';
import BottomNav from '../components/BottomNav';
import { fetchMotorStatus, toggleMotorState, updateSchedules, unlinkMotor, renameMotor } from '../services/api';
import { formatMotorTime } from '../utils/dateUtils';
import { 
    View, Text, StyleSheet, TouchableOpacity, 
    ScrollView, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, 
    Platform, Modal, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';


const MotorDetails = () => {
    const navigate = useNavigate();
    const { id: hexcode } = useParams();
    const [motorData, setMotorData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [unlinking, setUnlinking] = useState(false);
    const [renaming, setRenaming] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [newNickname, setNewNickname] = useState('');
  
    // Timer Modal State
    const [showTimerModal, setShowTimerModal] = useState(false);
    const [showScheduleForm, setShowScheduleForm] = useState(false);
    const [selH, setSelH] = useState(0);
    const [selM, setSelM] = useState(15);
  
    // Schedule Form State (Numeric for WheelPickers)
    const [hour, setHour] = useState(8);
    const [minute, setMinute] = useState(30);
    const [type, setType] = useState('everyday'); // everyday, weekly, particular
    const [duration, setDuration] = useState(30);
    const [selectedDays, setSelectedDays] = useState([new Date().getDay()]);
    const [date, setDate] = useState({ d: new Date().getDate(), m: new Date().getMonth() + 1, y: 26 });
  
    const toggleDay = (dayIndex) => {
        setSelectedDays(prev => {
            const arr = Array.isArray(prev) ? prev : [];
            return arr.indexOf(dayIndex) !== -1
                ? arr.filter(d => d !== dayIndex) 
                : [...arr, dayIndex];
        });
    };
  
    const loadMotorData = async () => {
      const data = await fetchMotorStatus(hexcode);
      if (data) {
        setMotorData(data);
      }
      setLoading(false);
    };
  
    useEffect(() => {
      loadMotorData();
      const interval = setInterval(loadMotorData, 10000);
      return () => clearInterval(interval);
    }, [hexcode]);
  
    const handleToggle = async (forcedDuration = -1) => {
        if (!motorData || actionLoading) return;
        const newState = !motorData.current_on;
        const normalizedDuration = typeof forcedDuration === 'number' ? forcedDuration : -1;
        if (newState === true && normalizedDuration === -1) {
            setShowTimerModal(true);
            return;
        }
        setActionLoading(true);
        setShowTimerModal(false);
        const finalDuration = normalizedDuration === -1 ? 0 : normalizedDuration;
        setMotorData(prev => ({ ...prev, current_on: newState }));
        try {
            await toggleMotorState(hexcode, newState, finalDuration);
            await loadMotorData();
        } catch (error) {
            Alert.alert('Control Error', error.message);
            setMotorData(prev => ({ ...prev, current_on: !newState }));
        } finally {
            setActionLoading(false);
        }
    };
  
    const addSchedule = async () => {
      let newSchedules = [];
      if (type === 'weekly') {
          if (selectedDays.length === 0) {
              Alert.alert('Error', 'Please select at least one day');
              return;
          }
          newSchedules = selectedDays.map((day, idx) => ({
              id: (Date.now() + idx).toString(),
              hour, minute, type,
              day,
              date: 0, month: 0, year: 0,
              duration: duration || 0,
          }));
      } else {
          newSchedules = [{
              id: Date.now().toString(),
              hour, minute, type,
              day: 0,
              date: type === 'particular' ? date.d : 0,
              month: type === 'particular' ? date.m : 0,
              year: type === 'particular' ? date.y : 0,
              duration: duration || 0,
          }];
      }
      const updated = [...(motorData.schedules || []), ...newSchedules];
      setSaving(true);
      try {
          await updateSchedules(hexcode, updated);
          setMotorData(prev => ({ ...prev, schedules: updated }));
          Alert.alert('Success', 'Schedule added!');
          setShowScheduleForm(false);
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

    const handleUnlink = () => {
        Alert.alert(
            'Remove Motor',
            `Are you sure you want to remove "${motorData?.nickname || 'this motor'}"?\n\nThis will unlink it from your account.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        setUnlinking(true);
                        try {
                            await unlinkMotor(hexcode);
                            Alert.alert('Done', 'Motor has been removed.', [
                                { text: 'OK', onPress: () => navigate('/') },
                            ]);
                        } catch (error) {
                            Alert.alert('Error', error.message);
                        } finally {
                            setUnlinking(false);
                        }
                    },
                },
            ]
        );
    };

    const handleRename = async () => {
        if (!newNickname.trim()) {
            Alert.alert('Error', 'Please enter a name');
            return;
        }
        setRenaming(true);
        try {
            await renameMotor(hexcode, newNickname.trim());
            setMotorData(prev => ({ ...prev, nickname: newNickname.trim() }));
            setShowRenameModal(false);
            Alert.alert('Success', 'Motor renamed successfully');
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setRenaming(false);
        }
    };

    const openRenameModal = () => {
        setNewNickname(motorData?.nickname || '');
        setShowRenameModal(true);
    };
  
    const getNextOffText = () => {
      if (motorData?.current_on) {
          if (motorData?.motorTurnOffTime) {
              return `Scheduled to be OFF at ${formatMotorTime(motorData.motorTurnOffTime)}`;
          }
          return "No upcoming auto-off";
      }
      return "";
    };

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <TimerModal 
              visible={showTimerModal} 
              selH={selH} setSelH={setSelH} 
              selM={selM} setSelM={setSelM} 
              onStartWithTimer={handleToggle} 
              onStartWithoutTimer={handleToggle} 
              onClose={() => setShowTimerModal(false)} 
          />
          
          <MotorHeader 
              onBack={() => navigate(-1)} 
              displayHex={motorData?.hexcode || '...'} 
              name={motorData?.nickname || 'Motor Details'} 
          />
  
          {loading ? (
            <View style={[styles.container, styles.center]}>
                <Text style={styles.loadingText}>Loading motor status...</Text>
            </View>
          ) : !motorData ? (
             <View style={[styles.container, styles.center]}>
                <Text style={styles.loadingText}>Motor not found.</Text>
                <TouchableOpacity onPress={() => navigate(-1)}>
                    <Text style={{color: '#38BDF8', marginTop: 10}}>Go Back</Text>
                </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <MotorStatusCard 
                    name={motorData.nickname || "Motor 1"}
                    isOn={motorData.current_on} 
                    starttime={motorData.starttime} 
                    nextOffText={getNextOffText()} 
                    onToggle={() => handleToggle()} 
                    loading={actionLoading} 
                />
  
                <GasGaugeCard gas_level={motorData.gas_level} />
  
                <View style={styles.fullScheduleSection}>
                    <TouchableOpacity 
                        style={[styles.expandBtn, showScheduleForm && styles.expandBtnActive]} 
                        onPress={() => setShowScheduleForm(!showScheduleForm)}
                    >
                        <CalendarDays color={showScheduleForm ? "#0A203F" : "#FFFFFF"} size={20} />
                        <Text style={[styles.expandBtnText, showScheduleForm && styles.expandBtnTextActive]}>
                            {showScheduleForm ? 'Close Scheduler' : 'Set New Schedule'}
                        </Text>
                        {showScheduleForm ? (
                            <X color="#0A203F" size={20} />
                        ) : (
                            <Plus color="#FFFFFF" size={20} />
                        )}
                    </TouchableOpacity>

                    {showScheduleForm && (
                        <ScheduleForm 
                            hour={hour} setHour={setHour} minute={minute} setMinute={setMinute} 
                            duration={duration} setDuration={setDuration} type={type} setType={setType} 
                            date={date} setDate={setDate} selectedDays={selectedDays} onToggleDay={toggleDay} 
                            onAdd={addSchedule} saving={saving} 
                        />
                    )}

                    <ActiveSchedulesList schedules={motorData.schedules} onDelete={deleteSchedule} />
                </View>

                <RenameModal 
                    visible={showRenameModal} 
                    value={newNickname} 
                    onChange={setNewNickname} 
                    onSave={handleRename} 
                    onClose={() => setShowRenameModal(false)} 
                    loading={renaming} 
                />

                <MotorActionsRow 
                    onRename={openRenameModal} 
                    onRemove={handleUnlink} 
                    unlinking={unlinking} 
                />
                <View style={{height: 40}} />
            </ScrollView>
          )}
        </View>
        <BottomNav />
      </SafeAreaView>
    );
};

// --- Sub-components for MotorDetails ---

const CustomToggle = ({ isOn, onToggle, loading }) => (
  <TouchableOpacity
    activeOpacity={1}
    onPress={onToggle}
    disabled={loading}
    style={[
      styles.toggleTrack, 
      { 
        backgroundColor: '#F1F5F9', // Light track for both
        opacity: loading ? 0.6 : 1,
        borderWidth: 1,
        borderColor: '#E2E8F0',
      }
    ]}
  >
    <View style={[
      styles.toggleThumb, 
      { 
        backgroundColor: isOn ? '#16A34A' : '#94A3B8', 
        alignSelf: isOn ? 'flex-end' : 'flex-start',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3
      }
    ]} />
  </TouchableOpacity>
);

const GasGauge = () => {
    return (
        <View style={styles.gaugeContainer}>
            <Svg width="120" height="70" viewBox="0 0 120 70">
                <Path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="#1E293B" strokeWidth="20" strokeLinecap="round" />
                <Path d="M 10 60 A 50 50 0 0 1 60 10" fill="none" stroke="#38BDF8" strokeWidth="20" strokeLinecap="round" />
            </Svg>
        </View>
    );
};

const WheelPicker = ({ data, selectedValue, onValueChange, label, containerHeight = 120 }) => {
    const itemHeight = 40;
    const padding = (containerHeight - itemHeight) / 2;
    const scrollRef = React.useRef(null);

    // Initial scroll position
    useEffect(() => {
        const index = data.indexOf(selectedValue);
        if (index !== -1 && scrollRef.current) {
            setTimeout(() => {
                scrollRef.current?.scrollTo({ y: index * itemHeight, animated: false });
            }, 1000);
        }
    }, []);

    return (
        <View style={styles.wheelWrapper}>
            <ScrollView
                ref={scrollRef}
                snapToInterval={itemHeight}
                showsVerticalScrollIndicator={false}
                decelerationRate="fast"
                nestedScrollEnabled={true}
                contentContainerStyle={{ paddingVertical: padding }}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.y / itemHeight);
                    if (data[index] !== undefined) onValueChange(data[index]);
                }}
            >
                {data.map((item, i) => (
                    <View key={i} style={[styles.wheelItem, { height: itemHeight }]}>
                        <Text style={[
                            styles.wheelItemText, 
                            selectedValue === item && styles.wheelItemTextActive
                        ]}>
                            {item.toString().padStart(2, '0')}
                        </Text>
                    </View>
                ))}
            </ScrollView>
            <Text style={styles.wheelLabel}>{label}</Text>
        </View>
    );
};

const TimerModal = ({ visible, selH, setSelH, selM, setSelM, onStartWithTimer, onStartWithoutTimer, onClose }) => (
    <Modal visible={visible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.bottomSheet}>
                <View style={styles.sheetHandle} />
                <Text style={styles.modalTitle}>Set a Timer to turn OFF automatically</Text>
                <View style={styles.pickersContainer}>
                    <View style={styles.pickerIndicator} pointerEvents="none" />
                    <WheelPicker label="hours" data={[0,1,2,3,4,5,6,7,8,9,10,11,12]} selectedValue={selH} onValueChange={setSelH} containerHeight={120} />
                    <WheelPicker label="min" data={[0,5,10,15,20,25,30,35,40,45,50,55]} selectedValue={selM} onValueChange={setSelM} containerHeight={120} />
                </View>
                <TouchableOpacity style={styles.startWithTimerBtn} onPress={() => onStartWithTimer(selH * 60 + selM)}>
                    <Text style={styles.startWithTimerText}>START WITH {selH > 0 ? `${selH}h ` : ''}{selM}m TIMER</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.startWithoutTimerBtn} onPress={() => onStartWithoutTimer(0)}>
                    <Text style={styles.startWithoutTimerText}>START WITHOUT TIMER</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeModalBtn} onPress={onClose}>
                    <X color="#94A3B8" size={24} />
                </TouchableOpacity>
            </View>
        </View>
    </Modal>
);

const MotorHeader = ({ onBack, displayHex, name }) => (
    <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <ChevronLeft color="#000" size={24} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{name}</Text>
            <Text style={styles.headerSubtitle}>HEX {displayHex || 'Unknown'}</Text>
        </View>
        <TouchableOpacity style={styles.bellButton}>
            <Bell color="#111827" size={20} />
            <View style={styles.notificationDot} />
        </TouchableOpacity>
    </View>
);

const MotorStatusCard = ({ name = "Motor 1", isOn, starttime, nextOffText, onToggle, loading }) => (
    <View style={[styles.cardContainer, { backgroundColor: isOn ? '#003B00' : '#3C3C3C' }]}>
        <View style={styles.cardContentRow}>
            <View style={styles.cardLeftColumn}>
                <Text style={styles.cardTitle}>{name}</Text>
                <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: isOn ? '#16A34A' : '#94A3B8' }]} />
                    <Text style={styles.statusText}>
                        {isOn ? 'Turned ON' : 'Turned OFF'} {starttime ? `since ${formatMotorTime(starttime)}` : ''}
                    </Text>
                </View>
            </View>
            <View style={styles.cardRightColumn}>
                <CustomToggle isOn={isOn} onToggle={onToggle} loading={loading} />
            </View>
        </View>
        {nextOffText ? <Text style={styles.scheduledText}>{nextOffText}</Text> : null}
    </View>
);

const GasGaugeCard = ({ gas_level }) => (
    <View style={[styles.cardContainer, styles.gasCard]}>
        <View style={styles.gasTopRow}>
            <View style={styles.gasGaugeWrapper}><GasGauge /></View>
            <View style={styles.gasTextWrapper}>
                <Text style={styles.gasTitle}>GAS</Text>
                <Text style={styles.gasValue}>{gas_level ?? 'N/A'}</Text>
            </View>
        </View>
        <Text style={styles.gasFooterText}>Gas is in the safe limit that is 1600</Text>
    </View>
);

const ScheduleForm = ({ 
    hour, setHour, minute, setMinute, duration, setDuration, type, setType, 
    date, setDate, selectedDays = [], onToggleDay = () => {}, onAdd, saving 
}) => {
    const hoursArr = Array.from({length: 24}, (_, i) => i);
    const minsArr = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    const durationsArr = [0, 5, 10, 15, 30, 45, 60, 90, 120];
    return (
        <View style={styles.formCard}>
            <View style={styles.formHeader}><CalendarDays color="#FFFFFF" size={20} /><Text style={styles.formTitle}>Set Schedule</Text></View>
            <View style={[styles.pickersContainer, {height: 120, marginBottom: 30}]}>
                <View style={[styles.pickerIndicator, {top: 38, height: 44}]} pointerEvents="none" />
                <WheelPicker label="hr" data={hoursArr} selectedValue={hour} onValueChange={setHour} containerHeight={120} />
                <WheelPicker label="min" data={minsArr} selectedValue={minute} onValueChange={setMinute} containerHeight={120} />
                <WheelPicker label="run" data={durationsArr} selectedValue={duration} onValueChange={setDuration} containerHeight={120} />
            </View>
            <View style={styles.typeSelector}>
                {['everyday', 'weekly', 'particular'].map(t => (
                    <TouchableOpacity key={t} style={[styles.typeBtn, type === t && styles.typeBtnActive]} onPress={() => setType(t)}>
                        <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>{t.toUpperCase()}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            {type === 'particular' && (
                <View style={[styles.pickersContainer, {height: 120, marginBottom: 25}]}>
                    <View style={[styles.pickerIndicator, {top: 38, height: 44}]} pointerEvents="none" />
                    <WheelPicker label="D" data={Array.from({length: 31}, (_, i) => i+1)} selectedValue={date.d} onValueChange={v => setDate({...date, d: v})} containerHeight={120} />
                    <WheelPicker label="M" data={Array.from({length: 12}, (_, i) => i+1)} selectedValue={date.m} onValueChange={v => setDate({...date, m: v})} containerHeight={120} />
                    <WheelPicker label="Y" data={[25, 26, 27, 28]} selectedValue={date.y} onValueChange={v => setDate({...date, y: v})} containerHeight={120} />
                </View>
            )}
            {type === 'weekly' && (
                <View style={styles.daySelector}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => {
                        const isSelected = Array.isArray(selectedDays) && selectedDays.indexOf(i) !== -1;
                        return (
                            <TouchableOpacity key={d} style={[styles.dayBtn, isSelected && styles.dayBtnActive]} onPress={() => onToggleDay(i)}>
                                <Text style={[styles.dayBtnText, isSelected && styles.dayBtnTextActive]}>{d}</Text>
                            </TouchableOpacity>
                        );
                    })}
                  </ScrollView>
                </View>
            )}
            <TouchableOpacity style={styles.addButton} onPress={onAdd} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <><Plus color="#FFFFFF" size={20} /><Text style={styles.addButtonText}>Save Schedule</Text></>}
            </TouchableOpacity>
        </View>
    );
};

const ActiveSchedulesList = ({ schedules, onDelete }) => (
    <>
        <Text style={styles.subSectionTitle}>Active Schedules</Text>
        {schedules && schedules.length > 0 ? (
            schedules.map((s, index) => (
                <View key={s.id || index} style={styles.scheduleRow}>
                    <View style={styles.scheduleIconBox}>
                        {s.type === 'everyday' ? <Calendar color="#FFFFFF" size={18} /> : s.type === 'weekly' ? <Clock color="#FFFFFF" size={18} /> : <Star color="#FFFFFF" size={18} />}
                    </View>
                    <View style={styles.scheduleInfo}>
                        <Text style={styles.scheduleTimeText}>{s.hour.toString().padStart(2, '0')}:{s.minute.toString().padStart(2, '0')}</Text>
                        <Text style={styles.scheduleTypeText}>
                            {s.type} {s.type === 'weekly' ? `(${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][s.day]})` : ''} {s.duration ? `• ${s.duration} min run` : ''}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => onDelete(s.id)} style={styles.deleteBtn}><Trash2 color="#EF4444" size={20} /></TouchableOpacity>
                </View>
            ))
        ) : <Text style={styles.emptyText}>No schedules set yet</Text>}
    </>
);

const RenameModal = ({ visible, value, onChange, onSave, onClose, loading }) => (
    <Modal visible={visible} transparent={true} animationType="fade">
        <View style={styles.modalOverlayCentered}>
            <View style={styles.renameModalContent}>
                <Text style={styles.renameTitle}>Rename Motor</Text>
                <TextInput
                    style={styles.renameInput}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Enter new name"
                    placeholderTextColor="#94A3B8"
                    autoFocus={true}
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={onSave}
                />
                <View style={styles.renameActions}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

const MotorActionsRow = ({ onRename, onRemove, unlinking }) => (
    <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtnRename} onPress={onRename}>
            <Text style={styles.actionBtnText}>Rename Motor</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtnRemove, unlinking && { opacity: 0.7 }]} onPress={onRemove} disabled={unlinking}>
            {unlinking ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.actionBtnText}>Remove Motor</Text>}
        </TouchableOpacity>
    </View>
);

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
  cardContainer: { borderRadius: 12, padding: 24, marginBottom: 16 },
  cardContentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeftColumn: { flex: 1, paddingRight: 20 },
  cardRightColumn: { marginLeft: 16 },
  cardTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusText: { color: '#94A3B8', fontSize: 14, fontWeight: '500' },
  scheduledText: { color: '#E2E8F0', fontSize: 14, fontWeight: '600', letterSpacing: 0.2, marginTop: 20 },
  toggleTrack: { width: 68, height: 34, borderRadius: 17, justifyContent: 'center', padding: 2 },
  toggleThumb: { width: 28, height: 28, borderRadius: 14 },
  gasCard: { 
    backgroundColor: '#0A203F', 
    borderRadius: 12,
    paddingVertical: 28,
    marginBottom: 16
  },
  gasTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  gasGaugeWrapper: { flex: 1.5 },
  gaugeContainer: { alignItems: 'center', justifyContent: 'center' },
  gasTextWrapper: { flex: 1, alignItems: 'flex-start', justifyContent: 'center' },
  gasTitle: { color: '#94A3B8', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  gasValue: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', marginTop: 4 },
  gasFooterText: { color: '#10B981', fontSize: 14, textAlign: 'center', fontWeight: '600' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#0F172A', fontSize: 16 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginVertical: 20 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabButtonActive: { backgroundColor: '#FFFFFF', elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2 },
  tabButtonText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  tabButtonTextActive: { color: '#0F172A' },
  fullScheduleSection: { marginBottom: 20 },
  formCard: { backgroundColor: '#0A203F', borderRadius: 24, padding: 24, marginBottom: 24 },
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
  typeBtnActive: { backgroundColor: '#149644' },
  typeBtnText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  typeBtnTextActive: { color: '#FFFFFF' },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  dateInput: { backgroundColor: '#1E293B', borderRadius: 8, width: '30%', height: 40, color: '#FFFFFF', textAlign: 'center' },
  daySelector: { flexDirection: 'row', marginBottom: 20 },
  dayBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  dayBtnActive: { backgroundColor: '#FFFFFF' },
  dayBtnText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  dayBtnTextActive: { color: '#0A203F' },
  addButton: { backgroundColor: '#149644', height: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginLeft: 8 },
  subSectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  scheduleIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#0A203F', alignItems: 'center', justifyContent: 'center' },
  scheduleInfo: { flex: 1, marginLeft: 16 },
  scheduleTimeText: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  scheduleTypeText: { fontSize: 12, color: '#64748B', textTransform: 'capitalize', marginTop: 2 },
  deleteBtn: { padding: 8 },
  emptyText: { color: '#94A3B8', textAlign: 'center', marginTop: 10, fontSize: 14 },
  // Compatibility styles for old components if any
  scheduleItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  scheduleIconWrapper: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#0A203F', alignItems: 'center', justifyContent: 'center' },
  scheduleDetails: { flex: 1, marginLeft: 16 },
  scheduleTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 4 },
  scheduleSubtitle: { fontSize: 12, color: '#6B7280' },
  scheduleTasks: { fontSize: 12, color: '#6B7280' },
  separator: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 4 },

  // Modal & Picker Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#000000',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    alignItems: 'center',
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    marginBottom: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 30,
  },
  pickersContainer: {
    flexDirection: 'row',
    height: 120, // Reduced height for tighter look
    width: '100%',
    justifyContent: 'space-around',
    marginBottom: 40,
    position: 'relative',
    alignItems: 'center',
    overflow: 'hidden',
  },
  pickerIndicator: {
    position: 'absolute',
    top: 38, // (120 - 44) / 2
    left: 0,
    right: 0,
    height: 44,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    opacity: 0.8,
  },
  wheelWrapper: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    zIndex: 2,
  },
  wheelItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemText: {
    color: '#64748B',
    fontSize: 20,
    fontWeight: '500',
  },
  wheelItemTextActive: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  wheelLabel: {
    color: '#94A3B8',
    fontSize: 12, // Slightly smaller to avoid overlap
    marginLeft: 0, 
    transform: [{ translateX: -20 }],
    fontWeight: '600',
    paddingBottom: 2,
    opacity: 0.8,
  },
  startWithTimerBtn: {
    backgroundColor: '#149644',
    width: '100%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  startWithTimerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  startWithoutTimerBtn: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#149644',
    justifyContent: 'center',
    alignItems: 'center',
  },
  startWithoutTimerText: {
    color: '#149644',
    fontSize: 14,
    fontWeight: '700',
  },
  closeModalBtn: {
      position: 'absolute',
      top: 24,
      right: 24,
  },
  expandBtn: {
      backgroundColor: '#0A203F',
      height: 56,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#1E293B',
  },
  expandBtnActive: {
      backgroundColor: '#FFFFFF',
      borderColor: '#E2E8F0',
  },
  expandBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
      flex: 1,
      marginLeft: 12,
  },
  expandBtnTextActive: {
      color: '#0A203F',
  },
  // Motor Action Styles (Rename & Remove)
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginBottom: 20,
  },
  actionBtnRename: {
    backgroundColor: '#0A203F',
    flex: 1,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  actionBtnRemove: {
    backgroundColor: '#DC2626',
    flex: 1,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Rename Modal Styles
  modalOverlayCentered: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  renameModalContent: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  renameTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 20,
  },
  renameInput: {
    width: '100%',
    height: 54,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  renameActions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 8,
  },
  cancelBtnText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#0A203F',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    minWidth: 100,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  }
});

export default MotorDetails;
