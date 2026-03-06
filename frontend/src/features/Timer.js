import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, TouchableOpacity, 
    TextInput, Alert, ActivityIndicator, Animated
} from 'react-native';
import { 
    Clock, Play, Square, RotateCcw, 
    ChevronLeft, Cpu, Shield
} from 'lucide-react-native';
import { useNavigate } from 'react-router-native';
import { fetchMyMotors, toggleMotorState, fetchMotorStatus } from '../services/api';
import BottomNav from '../components/BottomNav';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const Timer = () => {
    const navigate = useNavigate();
    
    // State
    const [motors, setMotors] = useState([]);
    const [selectedMotorHex, setSelectedMotorHex] = useState(null);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Form State
    const [hours, setHours] = useState('0');
    const [minutes, setMinutes] = useState('30');

    // Animation state
    const progress = useRef(new Animated.Value(1)).current;

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const motorList = await fetchMyMotors();
            setMotors(motorList);
            if (motorList.length > 0) {
                const hex = motorList[0].hexcode;
                setSelectedMotorHex(hex);
                await checkTimerStatus(hex);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const checkTimerStatus = async (hex) => {
        const status = await fetchMotorStatus(hex);
        if (status && status.current_on && status.motorTurnOffTime) {
            const offTime = new Date(status.motorTurnOffTime._seconds * 1000).getTime();
            const now = Date.now();
            const remaining = Math.max(0, Math.floor((offTime - now) / 1000));
            if (remaining > 0) {
                setSecondsLeft(remaining);
                setIsActive(true);
            }
        } else {
            setIsActive(false);
            setSecondsLeft(0);
        }
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    // Timer Tick
    useEffect(() => {
        let interval;
        if (isActive && secondsLeft > 0) {
            interval = setInterval(() => {
                setSecondsLeft(prev => {
                    if (prev <= 1) {
                        setIsActive(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else if (secondsLeft === 0) {
            setIsActive(false);
        }
        return () => clearInterval(interval);
    }, [isActive, secondsLeft]);

    const handleStart = async () => {
        const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
        if (totalMinutes <= 0) {
            Alert.alert('Invalid Time', 'Please enter a duration');
            return;
        }

        setActionLoading(true);
        try {
            await toggleMotorState(selectedMotorHex, true, totalMinutes);
            setSecondsLeft(totalMinutes * 60);
            setIsActive(true);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleStop = async () => {
        setActionLoading(true);
        try {
            await toggleMotorState(selectedMotorHex, false);
            setIsActive(false);
            setSecondsLeft(0);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const formatTime = (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#050B1B" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigate(-1)} style={styles.backButton}>
                        <ChevronLeft color="#0F172A" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Motor Timer</Text>
                    <View style={{width: 40}} /> 
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Motor Display */}
                    <View style={styles.motorDisplay}>
                        <Cpu color="#64748B" size={24} />
                        <Text style={styles.motorText}>Active Motor: {selectedMotorHex}</Text>
                    </View>

                    {/* Timer Visualizer */}
                    <View style={styles.timerCircleWrapper}>
                        <Svg width="260" height="260" viewBox="0 0 200 200">
                            {/* Background Circle */}
                            <Circle 
                                cx="100" cy="100" r="90" 
                                stroke="#F1F5F9" strokeWidth="8" fill="none" 
                            />
                            {/* Progress Circle */}
                            <Circle 
                                cx="100" cy="100" r="90" 
                                stroke={isActive ? "#10B981" : "#E2E8F0"} 
                                strokeWidth="8" 
                                fill="none"
                                strokeDasharray="565.48"
                                strokeDashoffset={isActive ? 0 : 565.48}
                                strokeLinecap="round"
                                transform="rotate(-90 100 100)"
                            />
                        </Svg>
                        <View style={styles.timerTextContainer}>
                            <Text style={styles.timerText}>{formatTime(secondsLeft)}</Text>
                            <Text style={styles.timerSubtext}>{isActive ? 'MOTOR RUNNING' : 'IDLE'}</Text>
                        </View>
                    </View>

                    {!isActive ? (
                        <View style={styles.inputContainer}>
                            <View style={styles.inputRow}>
                                <View style={styles.inputBox}>
                                    <Text style={styles.inputLabel}>HOURS</Text>
                                    <TextInput 
                                        style={styles.timeInput}
                                        value={hours}
                                        onChangeText={setHours}
                                        keyboardType="numeric"
                                        maxLength={2}
                                    />
                                </View>
                                <Text style={styles.separator}>:</Text>
                                <View style={styles.inputBox}>
                                    <Text style={styles.inputLabel}>MINUTES</Text>
                                    <TextInput 
                                        style={styles.timeInput}
                                        value={minutes}
                                        onChangeText={setMinutes}
                                        keyboardType="numeric"
                                        maxLength={2}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity 
                                style={styles.startBtn} 
                                onPress={handleStart}
                                disabled={actionLoading}
                            >
                                {actionLoading ? <ActivityIndicator color="#FFFFFF" /> : (
                                    <>
                                        <Play color="#FFFFFF" size={24} fill="#FFFFFF" />
                                        <Text style={styles.startBtnText}>Start Motor</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.activeControls}>
                            <TouchableOpacity 
                                style={styles.stopBtn} 
                                onPress={handleStop}
                                disabled={actionLoading}
                            >
                                {actionLoading ? <ActivityIndicator color="#FFFFFF" /> : (
                                    <>
                                        <Square color="#FFFFFF" size={24} fill="#FFFFFF" />
                                        <Text style={styles.stopBtnText}>Emergency Stop</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            <Text style={styles.infoText}>
                                The motor will turn off automatically when the timer reaches 00:00:00.
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </View>
            <BottomNav />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    container: { flex: 1 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 20,
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
    backButton: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 12 },
    scrollContent: { alignItems: 'center', paddingBottom: 40 },
    motorDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginTop: 10,
        marginBottom: 40,
    },
    motorText: { marginLeft: 10, color: '#64748B', fontWeight: '600', fontSize: 13 },
    timerCircleWrapper: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 60,
    },
    timerTextContainer: {
        position: 'absolute',
        alignItems: 'center',
    },
    timerText: {
        fontSize: 42,
        fontWeight: '800',
        color: '#050B1B',
        letterSpacing: 1,
    },
    timerSubtext: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94A3B8',
        marginTop: 4,
        letterSpacing: 2,
    },
    inputContainer: {
        width: '100%',
        paddingHorizontal: 32,
        alignItems: 'center',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    inputBox: {
        alignItems: 'center',
        width: 80,
    },
    inputLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94A3B8',
        marginBottom: 8,
        letterSpacing: 1,
    },
    timeInput: {
        backgroundColor: '#F1F5F9',
        width: '100%',
        height: 70,
        borderRadius: 16,
        fontSize: 32,
        fontWeight: '700',
        color: '#0F172A',
        textAlign: 'center',
    },
    separator: {
        fontSize: 32,
        fontWeight: '700',
        color: '#CBD5E1',
        marginHorizontal: 16,
        paddingTop: 18,
    },
    startBtn: {
        backgroundColor: '#10B981',
        width: '100%',
        height: 64,
        borderRadius: 32,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#10B981",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    startBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginLeft: 12 },
    activeControls: {
        width: '100%',
        paddingHorizontal: 32,
        alignItems: 'center',
    },
    stopBtn: {
        backgroundColor: '#EF4444',
        width: '100%',
        height: 64,
        borderRadius: 32,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stopBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginLeft: 12 },
    infoText: {
        marginTop: 24,
        color: '#94A3B8',
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
    }
});

export default Timer;
