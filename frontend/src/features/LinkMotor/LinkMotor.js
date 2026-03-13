import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TextInput, 
    TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Cpu, ChevronLeft, Link as LinkIcon, Edit3 } from 'lucide-react-native';
import { useNavigate } from 'react-router-native';
import { linkMotor, fetchMyMotors } from '../../services/api';
import StatusModal from '../../components/StatusModal';


const LinkMotor = () => {
    const navigate = useNavigate();
    const [hexcode, setHexcode] = useState('');
    const [nickname, setNickname] = useState('');
    const [loading, setLoading] = useState(false);
    
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


    useEffect(() => {
        const initDefaultName = async () => {
            try {
                const motors = await fetchMyMotors();
                setNickname(`Motor ${motors.length + 1}`);
            } catch (e) {
                setNickname('Motor 1');
            }
        };
        initDefaultName();
    }, []);

    const handleLink = async () => {
        if (!hexcode) {
            showStatus('error', 'Error', 'Please enter a hexcode');
            return;
        }
    
        setLoading(true);
        try {
            await linkMotor(hexcode, nickname || undefined);
            showStatus('success', 'SUCCESS!', 'Motor linked successfully!', () => navigate('/'));
        } catch (error) {
            showStatus('error', 'Linking Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusModal 
                visible={statusModal.visible}
                type={statusModal.type}
                title={statusModal.title}
                message={statusModal.message}
                onConfirm={statusModal.onConfirm}
                onClose={() => setStatusModal(prev => ({ ...prev, visible: false }))}
            />
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigate(-1)}>
                    <ChevronLeft color="#0F172A" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add New Motor</Text>
            </View>

            <ScrollView contentContainerStyle={{flexGrow: 1}}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <View style={styles.card}>
                    <View style={styles.iconCircle}>
                        <Cpu color="#FFFFFF" size={32} />
                    </View>
                    <Text style={styles.cardTitle}>Link Your Device</Text>
                    <Text style={styles.cardSubtitle}>
                        Enter the unique hexcode and give your motor a name.
                    </Text>

                    <View style={styles.inputLabelContainer}>
                        <LinkIcon color="#64748B" size={14} />
                        <Text style={styles.inputLabel}>DEVICE HEXCODE</Text>
                    </View>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., F1F1F1"
                            placeholderTextColor="#94A3B8"
                            value={hexcode}
                            onChangeText={setHexcode}
                            autoCapitalize="characters"
                        />
                    </View>

                    <View style={styles.inputLabelContainer}>
                        <Edit3 color="#64748B" size={14} />
                        <Text style={styles.inputLabel}>MOTOR NAME</Text>
                    </View>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={[styles.input, { letterSpacing: 0.5, fontSize: 16 }]}
                            placeholder="e.g., Garden Motor"
                            placeholderTextColor="#94A3B8"
                            value={nickname}
                            onChangeText={setNickname}
                        />
                    </View>

                    <TouchableOpacity 
                        style={[styles.linkButton, loading && styles.disabledButton]}
                        onPress={handleLink}
                        disabled={loading}
                    >
                        <LinkIcon color="#FFFFFF" size={20} style={{ marginRight: 8 }} />
                        <Text style={styles.linkButtonText}>
                            {loading ? 'Linking...' : 'Link Motor'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        marginLeft: 12,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#0A203F',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 12,
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    inputLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
        marginLeft: 6,
        letterSpacing: 0.5,
    },
    inputWrapper: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    input: {
        height: 56,
        fontSize: 18,
        fontWeight: '600',
        color: '#0F172A',
        textAlign: 'center',
        letterSpacing: 2,
    },
    linkButton: {
        width: '100%',
        height: 56,
        backgroundColor: '#0A203F',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledButton: {
        opacity: 0.7,
    },
    linkButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default LinkMotor;
