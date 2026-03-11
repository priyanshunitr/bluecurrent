import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, TextInput, 
    TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, Lock, User, ArrowRight } from 'lucide-react-native';
import { useNavigate } from 'react-router-native';
import { loginUser } from '../../services/api';

const Login = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!username || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            await loginUser(username, password);
            navigate('/');
        } catch (error) {
            Alert.alert('Login Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <View style={styles.logoWrapper}>
                            <Shield color="#FFFFFF" fill="#FFFFFF" size={40} />
                        </View>
                        <Text style={styles.welcomeText}>Welcome Back</Text>
                        <Text style={styles.subtitle}>Sign in to control your motors</Text>
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
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            <Text style={styles.loginButtonText}>
                                {loading ? 'Signing in...' : 'Sign In'}
                            </Text>
                            {!loading && <ArrowRight color="#FFFFFF" size={20} />}
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.registerLink}
                            onPress={() => navigate('/register')}
                        >
                            <Text style={styles.registerLinkText}>
                                Don't have an account? <Text style={styles.registerHighlight}>Register</Text>
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
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: '#0A203F',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
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

export default Login;
