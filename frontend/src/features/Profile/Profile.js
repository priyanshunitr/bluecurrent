import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, 
    TextInput, Alert, ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Lock, LogOut, ChevronRight, Shield } from 'lucide-react-native';
import { useNavigate } from 'react-router-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { changePassword, logoutUser } from '../../services/api';
import BottomNav from '../../components/BottomNav';
import StatusModal from '../../components/StatusModal';
import ConfirmModal from '../../components/ConfirmModal';



const Profile = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Status/Confirm Modal State
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
        const getUsername = async () => {
            const stored = await AsyncStorage.getItem('username');
            setUsername(stored || 'User');
        };
        getUsername();
    }, []);

    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword) {
            showStatus('error', 'Error', 'Please fill both password fields');
            return;
        }

        setLoading(true);
        try {
            await changePassword(oldPassword, newPassword);
            showStatus('success', 'SUCCESS!', 'Password updated successfully!');
            setOldPassword('');
            setNewPassword('');
        } catch (error) {
            showStatus('error', 'Update Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        setConfirmModal({
            visible: true,
            title: 'Sign Out',
            message: 'Are you sure you want to sign out of your account?',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, visible: false }));
                await logoutUser();
                navigate('/login');
            }
        });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ConfirmModal 
                visible={confirmModal.visible}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText="Sign Out"
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
            />
            <StatusModal 
                visible={statusModal.visible}
                type={statusModal.type}
                title={statusModal.title}
                message={statusModal.message}
                onConfirm={statusModal.onConfirm}
                onClose={() => setStatusModal(prev => ({ ...prev, visible: false }))}
            />
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Account Settings</Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
                    {/* User Info */}
                    <View style={styles.profileSection}>
                        <View style={styles.avatar}>
                            <User color="#FFFFFF" size={40} />
                        </View>
                        <Text style={styles.usernameText}>{username}</Text>
                        <Text style={styles.emailText}>BlueCurrent User</Text>
                    </View>

                    {/* Change Password */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Security</Text>
                        <View style={styles.card}>
                            <View style={styles.inputWrapper}>
                                <Lock color="#94A3B8" size={20} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Old Password"
                                    placeholderTextColor="#94A3B8"
                                    secureTextEntry
                                    value={oldPassword}
                                    onChangeText={setOldPassword}
                                />
                            </View>
                            <View style={[styles.inputWrapper, { borderBottomWidth: 0 }]}>
                                <Lock color="#94A3B8" size={20} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="New Password"
                                    placeholderTextColor="#94A3B8"
                                    secureTextEntry
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                />
                            </View>
                            <TouchableOpacity 
                                style={[styles.updateButton, loading && { opacity: 0.7 }]}
                                onPress={handleChangePassword}
                                disabled={loading}
                            >
                                <Text style={styles.updateButtonText}>
                                    {loading ? 'Updating...' : 'Update Password'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>App</Text>
                        <TouchableOpacity style={styles.actionItem} onPress={() => {}}>
                            <View style={styles.actionIconWrapper}>
                                <Shield color="#FFFFFF" size={20} />
                            </View>
                            <Text style={styles.actionText}>Privacy Policy</Text>
                            <ChevronRight color="#94A3B8" size={20} />
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.actionItem, styles.logoutItem]} onPress={handleLogout}>
                            <View style={[styles.actionIconWrapper, { backgroundColor: '#af0303ff' }]}>
                                <LogOut color="#FFFFFF" size={20} />
                            </View>
                            <Text style={[styles.actionText, { color: '#af0303ff' }]}>Sign Out</Text>
                        </TouchableOpacity>
                    </View>
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
        backgroundColor: '#FFFFFF',
    },
    header: {
        paddingHorizontal: 24,
        paddingVertical: 20,
        marginTop: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#0F172A',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
    },
    profileSection: {
        alignItems: 'center',
        marginVertical: 32,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#0A203F',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    usernameText: {
        fontSize: 22,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4,
    },
    emailText: {
        fontSize: 14,
        color: '#64748B',
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 16,
    },
    card: {
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    input: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: '#0F172A',
    },
    updateButton: {
        backgroundColor: '#0A203F',
        borderRadius: 12,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
    },
    updateButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 8,
    },
    actionIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#0A203F',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    actionText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
    },
    logoutItem: {
        marginTop: 8,
    },
});

export default Profile;
