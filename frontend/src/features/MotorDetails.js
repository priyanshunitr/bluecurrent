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
import StatusModal from '../components/StatusModal';
import ConfirmModal from '../components/ConfirmModal';
import NotificationModal from '../components/NotificationModal';
import { getNotificationHistory, syncMotorNotifications } from '../services/notificationService';



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
    const [showNotifications, setShowNotifications] = useState(false);
    const [hasNewNotifications, setHasNewNotifications] = useState(false);
  
    // Status Modal State
    const [confirmModal, setConfirmModal] = useState({
        visible: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        type: 'danger',
        onConfirm: null
    });

    const [statusModal, setStatusModal] = useState({
        visible: false,
        type: 'success',
        title: '',
        message: '',
        buttonText: '',
        onConfirm: null
    });

    const showStatus = (type, title, message, onConfirm = null, buttonText = '') => {
        setStatusModal({
            visible: true,
            type,
            title,
            message,
            buttonText,
            onConfirm: () => {
                setStatusModal(prev => ({ ...prev, visible: false }));
                if (onConfirm) onConfirm();
            }
        });
    };

  
    // Timer Modal State
    const [showTimerModal, setShowTimerModal] = useState(false);
    const [showScheduleForm, setShowScheduleForm] = useState(false);
    const [selH, setSelH] = useState(0);
    const [selM, setSelM] = useState(15);
  
    // Schedule Form State
    const [hour, setHour] = useState(8);
    const [minute, setMinute] = useState(30);
    const [ampm, setAmpm] = useState('AM');
    const [runH, setRunH] = useState(0);
    const [runM, setRunM] = useState(30);
    const [type, setType] = useState('everyday'); // everyday, weekly, particular
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
        // Explicitly sync this motor's notification state
        syncMotorNotifications([data], true);
      }
      checkNotifications();
      setLoading(false);
    };
  
    const checkNotifications = async () => {
        const history = await getNotificationHistory();
        setHasNewNotifications(history.some(n => !n.read));
    };

    useEffect(() => {
      loadMotorData();
      checkNotifications();
      const interval = setInterval(loadMotorData, 10000);
      return () => clearInterval(interval);
    }, [hexcode]);
  
    const handleToggle = async (forcedDuration = -1) => {
        if (!motorData || actionLoading) return;
        const newState = !motorData.current_on;
        
        // Validation for turning ON
        if (newState === true) {
            if (motorData.gas_level > 3000) {
                showStatus('error', 'Alert', "Motor can't be turned ON as the gas value is above 3000");
                return;
            }

            const normalizedDuration = typeof forcedDuration === 'number' ? forcedDuration : -1;
            if (normalizedDuration === -1) {
                setShowTimerModal(true);
                return;
            }

            // Execute turning ON
            executeToggle(true, normalizedDuration);
        } else {
            // Confirmation for turning OFF
            setConfirmModal({
                visible: true,
                title: 'Turn Off Motor',
                message: `Are you sure you want to turn off "${motorData?.nickname || 'this motor'}"?`,
                confirmText: 'Turn Off',
                type: 'danger',
                onConfirm: async () => {
                    setConfirmModal(prev => ({ ...prev, visible: false }));
                    executeToggle(false, 0);
                }
            });
        }
    };

    const executeToggle = async (newState, duration) => {
        setActionLoading(true);
        setShowTimerModal(false);
        setMotorData(prev => ({ ...prev, current_on: newState }));
        try {
            await toggleMotorState(hexcode, newState, duration);
            await loadMotorData();
        } catch (error) {
            showStatus('error', 'Control Error', error.message);
            setMotorData(prev => ({ ...prev, current_on: !newState }));
        } finally {
            setActionLoading(false);
        }
    };
  
    const addSchedule = async () => {
      // Convert to 24h format for backend
      let h24 = (parseInt(hour) % 12);
      if (ampm === 'PM') h24 += 12;

      const totalDuration = (parseInt(runH) * 60) + parseInt(runM);

      let newSchedules = [];
      if (type === 'weekly') {
          if (selectedDays.length === 0) {
              showStatus('error', 'Error', 'Please select at least one day');
              return;
          }
          newSchedules = selectedDays.map((day, idx) => ({
              id: (Date.now() + idx).toString(),
              hour: h24, 
              minute: parseInt(minute), 
              type,
              day,
              date: 0, month: 0, year: 0,
              duration: totalDuration || 0,
          }));
      } else {
          newSchedules = [{
              id: Date.now().toString(),
              hour: h24, 
              minute: parseInt(minute), 
              type,
              day: 0,
              date: type === 'particular' ? date.d : 0,
              month: type === 'particular' ? date.m : 0,
              year: type === 'particular' ? date.y : 0,
              duration: totalDuration || 0,
          }];
      }

      // Check for duplicates
      const existingSchedules = motorData.schedules || [];
      const hasConflict = newSchedules.some(ns => {
          return existingSchedules.some(es => {
              if (es.hour !== ns.hour || es.minute !== ns.minute) return false;
              
              // Same time, check overlap
              if (es.type === 'everyday' || ns.type === 'everyday') return true;
              if (es.type === 'weekly' && ns.type === 'weekly') return es.day === ns.day;
              if (es.type === 'particular' && ns.type === 'particular') {
                  return es.date === ns.date && es.month === ns.month && es.year === ns.year;
              }
              // Cross-check weekly vs particular
              if (es.type === 'weekly' && ns.type === 'particular') {
                  const d = new Date(2000 + ns.year, ns.month - 1, ns.date);
                  return es.day === d.getDay();
              }
              if (es.type === 'particular' && ns.type === 'weekly') {
                  const d = new Date(2000 + es.year, es.month - 1, es.date);
                  return d.getDay() === ns.day;
              }
              return false;
          });
      });

      if (hasConflict) {
          showStatus('error', 'Schedule Conflict', 'A schedule already exists for this time/day.');
          return;
      }
      const updated = [...(motorData.schedules || []), ...newSchedules];
      setSaving(true);
      try {
          await updateSchedules(hexcode, updated);
          setMotorData(prev => ({ ...prev, schedules: updated }));
          showStatus('success', 'SUCCESS!', 'Schedule added successfully!', () => setShowScheduleForm(false));
      } catch (error) {
          showStatus('error', 'Error', error.message);
      } finally {
          setSaving(false);
      }
    };
  
    const deleteSchedule = (id) => {
      setConfirmModal({
          visible: true,
          title: 'Delete Schedule',
          message: 'Are you sure you want to remove this schedule?',
          confirmText: 'Delete',
          type: 'danger',
          onConfirm: async () => {
              setConfirmModal(prev => ({ ...prev, visible: false }));
              const updated = motorData.schedules.filter(s => s.id !== id);
              try {
                  await updateSchedules(hexcode, updated);
                  setMotorData(prev => ({ ...prev, schedules: updated }));
              } catch (error) {
                  showStatus('error', 'Error', 'Failed to delete schedule');
              }
          }
      });
    };

    const handleUnlink = () => {
        setConfirmModal({
            visible: true,
            title: 'Remove Motor',
            message: `Are you sure you want to remove "${motorData?.nickname || 'this motor'}"?\n\nThis will unlink it from your account permanently.`,
            confirmText: 'Remove',
            type: 'danger',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, visible: false }));
                setUnlinking(true);
                try {
                    await unlinkMotor(hexcode);
                    showStatus('success', 'SUCCESS!', 'Motor has been removed.', () => navigate('/'));
                } catch (error) {
                    showStatus('error', 'Error', error.message);
                } finally {
                    setUnlinking(false);
                }
            }
        });
    };

    const handleRename = async () => {
        if (!newNickname.trim()) {
            showStatus('error', 'Error', 'Please enter a name');
            return;
        }
        setRenaming(true);
        try {
            await renameMotor(hexcode, newNickname.trim());
            setMotorData(prev => ({ ...prev, nickname: newNickname.trim() }));
            setShowRenameModal(false);
            showStatus('success', 'SUCCESS!', 'Motor renamed successfully');
        } catch (error) {
            showStatus('error', 'Error', error.message);
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
          <ConfirmModal 
            visible={confirmModal.visible}
            title={confirmModal.title}
            message={confirmModal.message}
            confirmText={confirmModal.confirmText}
            type={confirmModal.type}
            onConfirm={confirmModal.onConfirm}
            onCancel={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
          />
          <StatusModal 
            visible={statusModal.visible}
            type={statusModal.type}
            title={statusModal.title}
            message={statusModal.message}
            buttonText={statusModal.buttonText}
            onConfirm={statusModal.onConfirm}
            onClose={() => setStatusModal(prev => ({ ...prev, visible: false }))}
          />
          <NotificationModal 
            visible={showNotifications} 
            onClose={() => setShowNotifications(false)} 
          />
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
              onNotificationPress={() => {
                setShowNotifications(true);
                setHasNewNotifications(false);
              }}
              hasNewNotifications={hasNewNotifications}
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
                    gasValue={motorData.gas_level}
                />
  
                <GasGaugeCard gas_level={motorData.gas_level} />
  
                <View style={styles.fullScheduleSection}>
                    {!showScheduleForm && (
                        <TouchableOpacity 
                            style={styles.expandBtn} 
                            onPress={() => setShowScheduleForm(true)}
                        >
                            <CalendarDays color="#FFFFFF" size={20} />
                            <Text style={styles.expandBtnText}>Set New Schedule</Text>
                            <Plus color="#FFFFFF" size={20} />
                        </TouchableOpacity>
                    )}

                    {showScheduleForm && (
                        <ScheduleForm 
                            hour={hour} setHour={setHour} minute={minute} setMinute={setMinute} 
                            ampm={ampm} setAmpm={setAmpm} runH={runH} setRunH={setRunH} 
                            runM={runM} setRunM={setRunM} type={type} setType={setType} 
                            date={date} setDate={setDate} selectedDays={selectedDays} onToggleDay={toggleDay} 
                            onAdd={addSchedule} saving={saving} onClose={() => setShowScheduleForm(false)}
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

const GasGauge = ({ gas_level }) => {
    // Max possible gas value is 4095
    const radius = 50;
    const circumference = Math.PI * radius; 
    
    // Normalize gas_level (0 to 4095)
    // Handle N/A or null by treating as 0
    const safeGasLevel = typeof gas_level === 'number' ? gas_level : 0;
    const percentage = Math.min(Math.max(safeGasLevel / 4095, 0), 1);
    
    // Offset calculation
    const strokeDashoffset = circumference - (percentage * circumference);

    return (
        <View style={styles.gaugeContainer}>
            <Svg width="120" height="70" viewBox="0 0 120 70">
                <Path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="#1E293B" strokeWidth="20" strokeLinecap="butt" />
                <Path 
                    d="M 10 60 A 50 50 0 0 1 110 60" 
                    fill="none" 
                    stroke="#38BDF8" 
                    strokeWidth="20" 
                    strokeLinecap="butt"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                />
            </Svg>
        </View>
    );
};

const WheelPicker = ({ data, selectedValue, onValueChange, label, containerHeight = 120, itemHeight = 40, itemWidth = 60 }) => {
    const padding = (containerHeight - itemHeight) / 2;
    const scrollRef = React.useRef(null);

    // Initial scroll position
    useEffect(() => {
        const index = data.indexOf(selectedValue);
        if (index !== -1 && scrollRef.current) {
            setTimeout(() => {
                scrollRef.current?.scrollTo({ y: index * itemHeight, animated: false });
            }, 300);
        }
    }, []); // Trigger on mount

    return (
        <View style={{ width: itemWidth, height: containerHeight, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ flex: 1, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
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
                                {typeof item === 'number' ? item.toString().padStart(2, '0') : item}
                            </Text>
                        </View>
                    ))}
                </ScrollView>
                {label && (
                    <View style={{ height: itemHeight, justifyContent: 'center', marginLeft: 12 }}>
                        <Text style={styles.wheelLabel}>{label}</Text>
                    </View>
                )}
            </View>
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
                    <WheelPicker label="hours" data={[0,1,2,3,4,5,6,7,8,9,10,11,12]} selectedValue={selH} onValueChange={setSelH} containerHeight={120} itemWidth={100} />
                    <WheelPicker label="min" data={Array.from({length: 60}, (_, i) => i)} selectedValue={selM} onValueChange={setSelM} containerHeight={120} itemWidth={100} />
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

const MotorHeader = ({ onBack, displayHex, name, onNotificationPress, hasNewNotifications }) => (
    <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <ChevronLeft color="#000" size={24} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{name}</Text>
            <Text style={styles.headerSubtitle}>HEX {displayHex || 'Unknown'}</Text>
        </View>
        <TouchableOpacity style={styles.bellButton} onPress={onNotificationPress}>
            <Bell color="#111827" size={20} />
            {hasNewNotifications && <View style={styles.notificationDot} />}
        </TouchableOpacity>
    </View>
);

const MotorStatusCard = ({ name = "Motor 1", isOn, starttime, nextOffText, onToggle, loading, gasValue }) => (
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
        {gasValue > 3000 && (
            <Text style={[styles.scheduledText, { color: '#af0303ff', marginTop: nextOffText ? 12 : 20 }]}>
                Motor can't be turned ON as the gas value is above 3000
            </Text>
        )}
    </View>
);

const GasGaugeCard = ({ gas_level }) => (
    <View style={[styles.cardContainer, styles.gasCard]}>
        <View style={styles.gasTopRow}>
            <View style={styles.gasGaugeWrapper}><GasGauge gas_level={gas_level} /></View>
            <View style={styles.gasTextWrapper}>
                <Text style={styles.gasTitle}>GAS</Text>
                <Text style={styles.gasValue}>{gas_level ?? 'N/A'}</Text>
            </View>
        </View>
        <Text style={[styles.gasFooterText, gas_level > 3000 && { color: '#af0303ff' }]}>
            {gas_level > 3000 ? "Gas is above the safe limit of 3000" : "Gas is in the safe limit that is 3000"}
        </Text>
    </View>
);

const ScheduleForm = ({ 
    hour, setHour, minute, setMinute, ampm, setAmpm, runH, setRunH, runM, setRunM, 
    type, setType, date, setDate, selectedDays = [], onToggleDay = () => {}, onAdd, saving, onClose
}) => {
    const hoursArr = Array.from({length: 12}, (_, i) => i + 1);
    const minsArr = Array.from({length: 60}, (_, i) => i);
    const runHArr = Array.from({length: 13}, (_, i) => i);
    const runMArr = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    return (
        <View style={styles.formCard}>
            <View style={styles.formHeader}>
                <View style={styles.headerLeft}>
                    <CalendarDays color="#FFFFFF" size={24} />
                    <Text style={styles.formTitle}>Set Schedule</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <X color="#FFFFFF" size={24} />
                </TouchableOpacity>
            </View>

            {/* Type Selector (Tabs) */}
            <View style={styles.typeSelector}>
                {['everyday', 'weekly', 'particular'].map(t => (
                    <TouchableOpacity 
                        key={t} 
                        style={[styles.typeBtn, type === t && styles.typeBtnActive]} 
                        onPress={() => setType(t)}
                    >
                        <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                            {t.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Conditional Date/Day Selection - MOVED TO TOP */}
            {type === 'particular' && (
                <>
                    <Text style={styles.sectionLabel}>Select Date</Text>
                    <View style={[styles.darkPickerContainer, { marginTop: 0, marginBottom: 24 }]}>
                        <View style={styles.pickerOverlay} pointerEvents="none" />
                        <View style={styles.pickerRow}>
                            <WheelPicker data={Array.from({length: 31}, (_, i) => i+1)} selectedValue={date.d} onValueChange={v => setDate({...date, d: v})} itemWidth={40} containerHeight={100} />
                            <View style={styles.hugeUnitWrapper}><Text style={styles.unitLabel}>D</Text></View>
                            <View style={styles.dateColumnGap} />
                            <WheelPicker data={Array.from({length: 12}, (_, i) => i+1)} selectedValue={date.m} onValueChange={v => setDate({...date, m: v})} itemWidth={40} containerHeight={100} />
                            <View style={styles.hugeUnitWrapper}><Text style={styles.unitLabel}>M</Text></View>
                            <View style={styles.dateColumnGap} />
                            <WheelPicker data={[25, 26, 27, 28]} selectedValue={date.y} onValueChange={v => setDate({...date, y: v})} itemWidth={40} containerHeight={100} />
                            <View style={styles.hugeUnitWrapper}><Text style={styles.unitLabel}>Y</Text></View>
                        </View>
                    </View>
                </>
            )}
            {type === 'weekly' && (
                <View style={styles.weeklyGrid}>
                    {[
                        { label: 'MON', val: 1 },
                        { label: 'TUE', val: 2 },
                        { label: 'WED', val: 3 },
                        { label: 'THURS', val: 4 }
                    ].map((d) => {
                        const isSelected = Array.isArray(selectedDays) && selectedDays.indexOf(d.val) !== -1;
                        return (
                            <TouchableOpacity 
                                key={d.label} 
                                style={[styles.dayBox, isSelected && styles.dayBoxActive]} 
                                onPress={() => onToggleDay(d.val)}
                            >
                                <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>{d.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                    {[
                        { label: 'FRI', val: 5 },
                        { label: 'SAT', val: 6 },
                        { label: 'SUN', val: 0 }
                    ].map((d) => {
                        const isSelected = Array.isArray(selectedDays) && selectedDays.indexOf(d.val) !== -1;
                        return (
                            <TouchableOpacity 
                                key={d.label} 
                                style={[styles.dayBox, isSelected && styles.dayBoxActive]} 
                                onPress={() => onToggleDay(d.val)}
                            >
                                <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>{d.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                    {/* Placeholder for grid alignment */}
                    <View style={[styles.dayBox, { backgroundColor: 'transparent' }]} />
                </View>
            )}

            {/* Start Time Section */}
            <Text style={styles.sectionLabel}>Start Time</Text>
            <View style={styles.darkPickerContainer}>
                <View style={styles.pickerOverlay} pointerEvents="none" />
                <View style={styles.pickerRow}>
                    <WheelPicker data={hoursArr} selectedValue={hour} onValueChange={setHour} itemWidth={45} containerHeight={100} />
                    <View style={styles.hugeSeparatorWrapper}>
                        <Text style={styles.pickerSeparator}>:</Text>
                    </View>
                    <WheelPicker data={minsArr} selectedValue={minute} onValueChange={setMinute} itemWidth={45} containerHeight={100} />
                    <View style={styles.hugeAmpmWrapper}>
                        <WheelPicker data={['AM', 'PM']} selectedValue={ampm} onValueChange={setAmpm} itemWidth={60} containerHeight={100} />
                    </View>
                </View>
            </View>

            {/* Run Time Section */}
            <Text style={styles.sectionLabel}>Run Time</Text>
            <View style={styles.darkPickerContainer}>
                <View style={styles.pickerOverlay} pointerEvents="none" />
                <View style={styles.pickerRow}>
                    <WheelPicker data={runHArr} selectedValue={runH} onValueChange={setRunH} itemWidth={45} containerHeight={100} />
                    <View style={styles.hugeUnitWrapper}><Text style={styles.unitLabel}>HRS</Text></View>
                    <View style={styles.hugeColumnGap} />
                    <WheelPicker data={runMArr} selectedValue={runM} onValueChange={setRunM} itemWidth={45} containerHeight={100} />
                    <View style={styles.hugeUnitWrapper}><Text style={styles.unitLabel}>MIN</Text></View>
                </View>
            </View>

            <TouchableOpacity style={styles.addButton} onPress={onAdd} disabled={saving}>
                {saving ? (
                    <ActivityIndicator color="#0A203F" />
                ) : (
                    <Text style={styles.addButtonText}>SET SCHEDULE</Text>
                )}
            </TouchableOpacity>
        </View>
    );
};

const ActiveSchedulesList = ({ schedules, onDelete }) => {
    if (!schedules || schedules.length === 0) return null;
    return (
        <>
            <Text style={styles.subSectionTitle}>Active Schedules</Text>
            {schedules.map((s, index) => (
                <View key={s.id || index} style={styles.scheduleRow}>
                    <View style={styles.scheduleIconBox}>
                        {s.type === 'everyday' ? <Calendar color="#FFFFFF" size={18} /> : s.type === 'weekly' ? <Clock color="#FFFFFF" size={18} /> : <Star color="#FFFFFF" size={18} />}
                    </View>
                    <View style={styles.scheduleInfo}>
                        <Text style={styles.scheduleTimeText}>{(s.hour % 12 || 12).toString().padStart(2, '0')}:{s.minute.toString().padStart(2, '0')} {s.hour >= 12 ? 'PM' : 'AM'}</Text>
                        <Text style={styles.scheduleTypeText}>
                            {s.type} {s.type === 'weekly' ? `(${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][s.day]})` : ''} {s.duration ? `• ${s.duration} min run` : ''}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => onDelete(s.id)} style={styles.deleteBtn}><Trash2 color="#af0303ff" size={20} /></TouchableOpacity>
                </View>
            ))}
        </>
    );
};

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
  backButton: { backgroundColor: '#F3F4F6', padding: 10, borderRadius: 12 },
  headerTitleContainer: { flex: 1, marginLeft: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', fontFamily: 'Aeros' },
  headerSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2, fontFamily: 'Aeros' },
  bellButton: { backgroundColor: '#F8FAFC', padding: 10, borderRadius: 12, position: 'relative' },
  notificationDot: { position: 'absolute', top: 10, right: 12, width: 6, height: 6, borderRadius: 3, backgroundColor: '#af0303ff' },
  scrollContent: { flex: 1 },
  cardContainer: { borderRadius: 12, padding: 24, marginBottom: 16 },
  cardContentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeftColumn: { flex: 1, paddingRight: 20 },
  cardRightColumn: { marginLeft: 16 },
  cardTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 4, fontFamily: 'Aeros' },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { color: '#94A3B8', fontSize: 14, fontWeight: '600', fontFamily: 'Aeros' },
  scheduledText: { color: '#E2E8F0', fontSize: 14, fontWeight: '600', marginTop: 20, fontFamily: 'Aeros' },
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
  gasTitle: { color: '#94A3B8', fontSize: 13, fontWeight: '600', letterSpacing: 1, fontFamily: 'Aeros' },
  gasValue: { color: '#FFFFFF', fontSize: 28, fontWeight: '700', marginTop: 4, fontFamily: 'Aeros' },
  gasFooterText: { color: '#10B981', fontSize: 14, textAlign: 'center', fontWeight: '600', fontFamily: 'Aeros' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#0F172A', fontSize: 16, fontFamily: 'Aeros' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginVertical: 20 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabButtonActive: { backgroundColor: '#FFFFFF', elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2 },
  tabButtonText: { fontSize: 14, fontWeight: '600', color: '#64748B', fontFamily: 'Aeros' },
  tabButtonTextActive: { color: '#0F172A' },
  fullScheduleSection: { marginBottom: 20 },
  formCard: { backgroundColor: '#0A203F', borderRadius: 12, padding: 24, marginBottom: 16 },
  dayBtnTextActive: { color: '#FFFFFF' },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  formTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginLeft: 12, fontFamily: 'Aeros' },
  closeBtn: { padding: 4 },
  sectionLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 12, marginTop: 10, fontFamily: 'Aeros' },
  darkPickerContainer: {
    backgroundColor: '#001021',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  pickerOverlay: {
    position: 'absolute',
    top: 30,
    left: 12,
    right: 12,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
  },
  pickerRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
  },
  pickerSeparator: { color: '#FFFFFF', fontSize: 26, fontWeight: '700', marginBottom: 2, fontFamily: 'Aeros' },
  hugeSeparatorWrapper: { width: 60, height: 100, justifyContent: 'center', alignItems: 'center' },
  hugeAmpmWrapper: { marginLeft: 40, height: 100, justifyContent: 'center' },
  hugeColumnGap: { width: 60 },
  dateColumnGap: { width: 30 },
  hugeUnitWrapper: { height: 100, justifyContent: 'center', alignItems: 'center', paddingLeft: 8 },
  unitLabel: { color: '#64748B', fontSize: 10, fontWeight: '700', marginTop: 3, letterSpacing: 0.5, fontFamily: 'Aeros' },
  typeSelector: { 
    flexDirection: 'row', 
    backgroundColor: '#001021', 
    borderRadius: 12, 
    padding: 6, 
    marginBottom: 30 
  },
  typeBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  typeBtnActive: { backgroundColor: '#FFFFFF' },
  typeBtnText: { color: '#94A3B8', fontSize: 12, fontWeight: '600', fontFamily: 'Aeros' },
  typeBtnTextActive: { color: '#001A33' },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  dateInput: { backgroundColor: '#1E293B', borderRadius: 8, width: '30%', height: 40, color: '#FFFFFF', textAlign: 'center', fontFamily: 'Aeros' },
  weeklyGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 30 
  },
  dayBox: { 
    width: '23%', 
    height: 48, 
    backgroundColor: '#000000', 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 10,
  },
  dayBoxActive: { backgroundColor: '#FFFFFF' },
  dayText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600', fontFamily: 'Aeros' },
  dayTextActive: { color: '#000000' },
  addButton: { 
    backgroundColor: '#FFFFFF', 
    height: 56, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: 20
  },
  addButtonText: { color: '#001A33', fontSize: 16, fontWeight: '700', fontFamily: 'Aeros' },
  subSectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 16, fontFamily: 'Aeros' },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  scheduleIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#0A203F', alignItems: 'center', justifyContent: 'center' },
  scheduleInfo: { flex: 1, marginLeft: 16 },
  scheduleTimeText: { fontSize: 16, fontWeight: '700', color: '#0F172A', fontFamily: 'Aeros' },
  scheduleTypeText: { fontSize: 12, color: '#64748B', textTransform: 'capitalize', marginTop: 2, fontFamily: 'Aeros' },
  deleteBtn: { padding: 8 },
  emptyText: { color: '#94A3B8', textAlign: 'center', marginTop: 10, fontSize: 14, fontFamily: 'Aeros' },
  // Compatibility styles for old components if any
  scheduleItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  scheduleIconWrapper: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#0A203F', alignItems: 'center', justifyContent: 'center' },
  scheduleDetails: { flex: 1, marginLeft: 16 },
  scheduleTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 4, fontFamily: 'Aeros' },
  scheduleSubtitle: { fontSize: 12, color: '#6B7280', fontFamily: 'Aeros' },
  scheduleTasks: { fontSize: 12, color: '#6B7280', fontFamily: 'Aeros' },
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
    fontFamily: 'Aeros',
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
    alignItems: 'center',
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
    fontFamily: 'Aeros',
  },
  wheelItemTextActive: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Aeros',
  },
  wheelLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
    fontFamily: 'Aeros',
  },
  startWithTimerBtn: {
    backgroundColor: '#149644',
    width: '100%',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  startWithTimerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Aeros',
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
    fontWeight: '600',
    fontFamily: 'Aeros',
  },
  closeModalBtn: {
      position: 'absolute',
      top: 24,
      right: 24,
  },
  expandBtn: {
      backgroundColor: '#0A203F',
      height: 56,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginBottom: 16,
  },
  expandBtnActive: {
      backgroundColor: '#FFFFFF',
      borderColor: '#E2E8F0',
  },
  expandBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      flex: 1,
      marginLeft: 12,
      fontFamily: 'Aeros',
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
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionBtnRemove: {
    backgroundColor: '#af0303ff',
    flex: 1,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Aeros',
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
    borderRadius: 12,
    alignItems: 'center',
  },
  renameTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 20,
    fontFamily: 'Aeros',
  },
  renameInput: {
    width: '100%',
    height: 54,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
    fontFamily: 'Aeros',
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
    fontFamily: 'Aeros',
  },
  saveBtn: {
    backgroundColor: '#0A203F',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Aeros',
  }
});

export default MotorDetails;
