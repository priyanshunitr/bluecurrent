import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Image,
    TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, User, Phone, ArrowRight } from 'lucide-react-native';
import { useNavigate } from 'react-router-native';
import { registerUser } from '../../services/api';
import StatusModal from '../../components/StatusModal';


const Register = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
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


    const handleRegister = async () => {
        if (!username || !password || !phone) {
            showStatus('error', 'Error', 'Please fill in all fields');
            return;
        }

        // Basic validations
        if (username.length < 3) {
            showStatus('error', 'Invalid Username', 'Username must be at least 3 characters long');
            return;
        }

        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone)) {
            showStatus('error', 'Invalid Phone', 'Please enter a valid 10-digit phone number');
            return;
        }

        if (password.length < 6) {
            showStatus('error', 'Weak Password', 'Password must be at least 6 characters long');
            return;
        }

        setLoading(true);
        try {
            await registerUser(username, password, phone);
            showStatus('success', 'SUCCESS!', 'Registration successful! Please login.', () => navigate('/login'));
        } catch (error) {
            showStatus('error', 'Registration Failed', error.message);
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
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <View style={styles.logoWrapper}>
                            <Image 
                                source={require('../../assets/Bluecurrentlogo.png')} 
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.welcomeText}>Create Account</Text>
                        <Text style={styles.subtitle}>Join BlueCurrent to manage your devices</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputWrapper}>
                            <User color="#94A3B8" size={20} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Username"
                                placeholderTextColor="#94A3B8"
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputWrapper}>
                            <Phone color="#94A3B8" size={20} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Phone Number"
                                placeholderTextColor="#94A3B8"
                                value={phone}
                                onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
                                keyboardType="phone-pad"
                                maxLength={10}
                            />
                        </View>

                        <View style={styles.inputWrapper}>
                            <Lock color="#94A3B8" size={20} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Password"
                                placeholderTextColor="#94A3B8"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <TouchableOpacity 
                            style={[styles.loginButton, loading && styles.disabledButton]}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            <Text style={styles.loginButtonText}>
                                {loading ? 'Registering...' : 'Register'}
                            </Text>
                            {!loading && <ArrowRight color="#FFFFFF" size={20} />}
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.registerLink}
                            onPress={() => navigate('/login')}
                        >
                            <Text style={styles.registerLinkText}>
                                Already have an account? <Text style={styles.registerHighlight}>Login</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logoWrapper: {
        width: 100,
        height: 100,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 10,
    },
    logoImage: {
        width: 70,
        height: 70,
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#64748B',
    },
    form: {
        width: '100%',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        height: 56,
        color: '#0F172A',
        fontSize: 16,
    },
    loginButton: {
        backgroundColor: '#0A203F',
        borderRadius: 12,
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
    },
    disabledButton: {
        opacity: 0.7,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    registerLink: {
        marginTop: 24,
        alignItems: 'center',
    },
    registerLinkText: {
        color: '#64748B',
        fontSize: 14,
    },
    registerHighlight: {
        color: '#0A203F',
        fontWeight: '600',
    },
});

export default Register;
