import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, 
    ScrollView, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
    Clock, Calendar, Star, Trash2, Plus, 
    ChevronRight, Cpu, ChevronLeft, Bell
} from 'lucide-react-native';
import { useNavigate } from 'react-router-native';
import { fetchMyMotors, fetchSchedules, updateSchedules } from '../services/api';
import BottomNav from '../components/BottomNav';
import StatusModal from '../components/StatusModal';


const Schedule = () => {
    const navigate = useNavigate();
    
    // State
    const [motors, setMotors] = useState([]);
    const [selectedMotorHex, setSelectedMotorHex] = useState(null);
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Status Modal State
    const [statusModal, setStatusModal] = useState({
        visible: false,
        type: 'success',
        title: '',
        message: '',
        onConfirm: null
    });

    const showStatus = (type, title, message, onConfirm = null) => {
        setStatusModal({
            visible: true,
            type,
            title,
            message,
            onConfirm: () => {
                setStatusModal(prev => ({ ...prev, visible: false }));
                if (onConfirm) onConfirm();
            }
        });
    };


    // Form State
    const [hour, setHour] = useState('');
    const [minute, setMinute] = useState('');
    const [type, setType] = useState('everyday'); // everyday, weekly, particular
    const [duration, setDuration] = useState('');
    const [selectedDay, setSelectedDay] = useState(new Date().getDay());
    const [date, setDate] = useState({ d: '', m: '', y: '' });

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const motorList = await fetchMyMotors();
            setMotors(motorList);
            if (motorList.length > 0) {
                setSelectedMotorHex(motorList[0].hexcode);
                const scheds = await fetchSchedules(motorList[0].hexcode);
                setSchedules(scheds);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    const handleMotorChange = async (hex) => {
        setSelectedMotorHex(hex);
        setLoading(true);
        const scheds = await fetchSchedules(hex);
        setSchedules(scheds);
        setLoading(false);
    };

    const addSchedule = async () => {
        const h = parseInt(hour);
        const m = parseInt(minute);

        if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
            showStatus('error', 'Invalid Time', 'Please enter a valid hour (0-23) and minute (0-59)');
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
            year: type === 'particular' ? parseInt(date.y) || 26 : 0, // default 26 for 2026
            duration: parseInt(duration) || 0,
        };

        const updated = [...schedules, newSchedule];
        setSaving(true);
        try {
            await updateSchedules(selectedMotorHex, updated);
            setSchedules(updated);
            // Clear form
            setHour(''); setMinute(''); setDuration('');
            showStatus('success', 'SUCCESS!', 'Schedule added successfully!');
        } catch (error) {
            showStatus('error', 'Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    const deleteSchedule = async (id) => {
        const updated = schedules.filter(s => s.id !== id);
        try {
            await updateSchedules(selectedMotorHex, updated);
            setSchedules(updated);
        } catch (error) {
            showStatus('error', 'Error', 'Failed to delete schedule');
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0A203F" />
                    <Text style={styles.loadingText}>Loading Schedules...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusModal 
                visible={statusModal.visible}
                type={statusModal.type}
                title={statusModal.title}
                message={statusModal.message}
                onConfirm={statusModal.onConfirm}
                onClose={() => setStatusModal(prev => ({ ...prev, visible: false }))}
            />
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigate(-1)} style={styles.backButton}>
                        <ChevronLeft color="#0F172A" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Schedule Manager</Text>
                    <View style={{width: 40}} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    
                    {/* Motor Selector */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Select Motor</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.motorSelector}>
                            {motors.map(m => (
                                <TouchableOpacity 
                                    key={m.hexcode}
                                    style={[styles.motorTab, selectedMotorHex === m.hexcode && styles.motorTabActive]}
                                    onPress={() => handleMotorChange(m.hexcode)}
                                >
                                    <Cpu color={selectedMotorHex === m.hexcode ? '#FFFFFF' : '#64748B'} size={18} />
                                    <Text style={[styles.motorTabText, selectedMotorHex === m.hexcode && styles.motorTabTextActive]}>
                                        {m.hexcode}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Quick Add Form */}
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
                                <Text style={styles.inputLabel}>Duration (Min)</Text>
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

                        {/* Type Selector */}
                        <View style={styles.typeSelector}>
                            {['everyday', 'weekly', 'particular'].map(t => (
                                <TouchableOpacity 
                                    key={t}
                                    style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                                    onPress={() => setType(t)}
                                >
                                    <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                                        {t.charAt(0).toUpperCase() + t.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Extra Type Inputs */}
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
                            {saving ? <ActivityIndicator color="#0A203F" /> : (
                                <>
                                    <Plus color="#0A203F" size={20} />
                                    <Text style={styles.addButtonText}>Set Schedule</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* List Section */}
                    <View style={styles.listSection}>
                        <Text style={styles.sectionTitle}>Active Schedules</Text>
                        {schedules.length === 0 ? (
                            <View style={styles.emptyList}>
                                <Clock color="#94A3B8" size={48} />
                                <Text style={styles.emptyText}>No schedules set yet</Text>
                            </View>
                        ) : (
                            schedules.map((s, idx) => (
                                <View key={s.id || idx} style={styles.scheduleRow}>
                                    <View style={styles.scheduleIconBox}>
                                        {s.type === 'everyday' ? <Calendar color="#FFFFFF" size={18} /> : 
                                         s.type === 'weekly' ? <Clock color="#FFFFFF" size={18} /> : 
                                         <Star color="#FFFFFF" size={18} />}
                                    </View>
                                    <View style={styles.scheduleInfo}>
                                        <Text style={styles.scheduleTime}>
                                            {(s.hour % 12 || 12).toString().padStart(2, '0')}:{s.minute.toString().padStart(2, '0')} {s.hour >= 12 ? 'PM' : 'AM'}
                                        </Text>
                                        <Text style={styles.scheduleType}>
                                            {s.type} {s.duration ? `• ${s.duration} min run` : ''}
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={() => deleteSchedule(s.id)} style={styles.deleteBtn}>
                                        <Trash2 color="#EF4444" size={20} />
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>
            </View>
            <BottomNav />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: '#64748B', fontSize: 16 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 20,
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
    backButton: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 12 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: '#64748B', marginBottom: 16 },
    motorSelector: { flexDirection: 'row' },
    motorTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#F1F5F9',
        borderRadius: 30,
        marginRight: 10,
    },
    motorTabActive: { backgroundColor: '#0A203F' },
    motorTabText: { marginLeft: 8, fontSize: 14, color: '#64748B', fontWeight: '500' },
    motorTabTextActive: { color: '#FFFFFF' },
    formCard: {
        backgroundColor: '#0A203F',
        borderRadius: 24,
        padding: 24,
        marginBottom: 32,
    },
    formHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    formTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', marginLeft: 10 },
    timeRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 24 },
    inputGroup: { flex: 1 },
    inputLabel: { color: '#94A3B8', fontSize: 12, marginBottom: 8, fontWeight: '500' },
    timeInput: {
        backgroundColor: '#1E293B',
        borderRadius: 12,
        height: 60,
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
    },
    timeSeparator: { color: '#94A3B8', fontSize: 32, marginHorizontal: 8, paddingBottom: 5 },
    durationInput: {
        backgroundColor: '#1E293B',
        borderRadius: 12,
        height: 60,
        color: '#FFFFFF',
        fontSize: 16,
        textAlign: 'center',
    },
    typeSelector: {
        flexDirection: 'row',
        backgroundColor: '#1E293B',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    typeBtnActive: { backgroundColor: '#FFFFFF' },
    typeBtnText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
    typeBtnTextActive: { color: '#0A203F' },
    dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    dateInput: { backgroundColor: '#1E293B', borderRadius: 8, width: '30%', height: 45, color: '#FFFFFF', textAlign: 'center' },
    daySelector: { flexDirection: 'row', marginBottom: 20 },
    dayBtn: { width: 45, height: 45, borderRadius: 22, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    dayBtnActive: { backgroundColor: '#FFFFFF' },
    dayBtnText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
    dayBtnTextActive: { color: '#0A203F' },
    addButton: {
        backgroundColor: '#10B981', // Emerald green 
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonText: { color: '#0A203F', fontSize: 16, fontWeight: '700', marginLeft: 8 },
    listSection: {},
    emptyList: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { color: '#94A3B8', marginTop: 12, fontSize: 14 },
    scheduleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    scheduleIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#0A203F',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scheduleInfo: { flex: 1, marginLeft: 16 },
    scheduleTime: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
    scheduleType: { fontSize: 12, color: '#64748B', textTransform: 'capitalize', marginTop: 2 },
    deleteBtn: { padding: 8 }
});

export default Schedule;
