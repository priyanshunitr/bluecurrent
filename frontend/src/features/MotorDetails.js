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
import { showMotorOnNotification, cancelMotorOnNotification } from '../services/notificationService';
import { 
    View, Text, StyleSheet, TouchableOpacity, 
    ScrollView, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, 
    Platform, Modal, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import StatusModal from '../components/StatusModal';
import ConfirmModal from '../components/ConfirmModal';



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
  
    // Status Modal State
    const [confirmModal, setConfirmModal] = useState({
        visible: false,
        title: '',
        message: '',
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
        // Sync notification with current motor state
        if (data.current_on) {
            showMotorOnNotification(hexcode, data.nickname || `Motor ${hexcode}`, data.starttime);
        } else {
            cancelMotorOnNotification(hexcode);
        }
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
  
    const deleteSchedule = async (id) => {
      const updated = motorData.schedules.filter(s => s.id !== id);
      try {
          await updateSchedules(hexcode, updated);
          setMotorData(prev => ({ ...prev, schedules: updated }));
      } catch (error) {
          showStatus('error', 'Error', 'Failed to delete schedule');
      }
    };

    const handleUnlink = () => {
        setConfirmModal({
            visible: true,
            title: 'Remove Motor',
            message: `Are you sure you want to remove "${motorData?.nickname || 'this motor'}"?\n\nThis will unlink it from your account permanently.`,
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
            confirmText="Remove"
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
                    <View style={{ height: itemHeight, justifyContent: 'center', marginLeft: 4 }}>
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
            <View style={styles.gasGaugeWrapper}><GasGauge gas_level={gas_level} /></View>
            <View style={styles.gasTextWrapper}>
                <Text style={styles.gasTitle}>GAS</Text>
                <Text style={styles.gasValue}>{gas_level ?? 'N/A'}</Text>
            </View>
        </View>
        <Text style={styles.gasFooterText}>Gas is in the safe limit that is 3000</Text>
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
                <>
                    <Text style={styles.sectionLabel}>Select Days</Text>
                    <View style={styles.daySelectorWrapper}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySelector}>
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
                </>
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
  formCard: { backgroundColor: '#0A203F', borderRadius: 12, padding: 24, marginBottom: 24 },
  dayBtnTextActive: { color: '#FFFFFF' },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  formTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginLeft: 12 },
  closeBtn: { padding: 4 },
  sectionLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 12, marginTop: 10 },
  darkPickerContainer: {
    backgroundColor: '#001021',
    borderRadius: 16,
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
    borderRadius: 10,
  },
  pickerRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
  },
  pickerSeparator: { color: '#FFFFFF', fontSize: 26, fontWeight: '700', marginBottom: 2 },
  hugeSeparatorWrapper: { width: 60, height: 100, justifyContent: 'center', alignItems: 'center' },
  hugeAmpmWrapper: { marginLeft: 40, height: 100, justifyContent: 'center' },
  hugeColumnGap: { width: 60 },
  dateColumnGap: { width: 30 },
  hugeUnitWrapper: { height: 100, justifyContent: 'center', alignItems: 'center', paddingLeft: 8 },
  unitLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', marginTop: 3, letterSpacing: 0.5 },
  typeSelector: { 
    flexDirection: 'row', 
    backgroundColor: '#001021', 
    borderRadius: 12, 
    padding: 6, 
    marginBottom: 30 
  },
  typeBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  typeBtnActive: { backgroundColor: '#FFFFFF' },
  typeBtnText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  typeBtnTextActive: { color: '#001A33' },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  dateInput: { backgroundColor: '#1E293B', borderRadius: 8, width: '30%', height: 40, color: '#FFFFFF', textAlign: 'center' },
  daySelectorWrapper: { marginBottom: 30, marginTop: 10 },
  daySelector: { paddingRight: 20 },
  dayBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#001A33', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#1E293B', elevation: 2 },
  dayBtnActive: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  dayBtnText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  dayBtnTextActive: { color: '#001A33' },
  addButton: { 
    backgroundColor: '#FFFFFF', 
    height: 56, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: 20
  },
  addButtonText: { color: '#001A33', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
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
  },
  wheelItemTextActive: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  wheelLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 0.5,
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
      borderRadius: 12,
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
