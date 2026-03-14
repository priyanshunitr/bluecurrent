import React, { useEffect, useState } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, 
    Modal, ScrollView, Dimensions, ActivityIndicator 
} from 'react-native';
import { Bell, X, Trash2, Clock, Info } from 'lucide-react-native';
import { getNotificationHistory, clearNotificationHistory, markNotificationsAsRead } from '../services/notificationService';

const { width, height } = Dimensions.get('window');

const NotificationModal = ({ visible, onClose }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            loadNotifications();
            markNotificationsAsRead();
        }
    }, [visible]);

    const loadNotifications = async () => {
        setLoading(true);
        const history = await getNotificationHistory();
        setNotifications(history);
        setLoading(false);
    };

    const handleClear = async () => {
        await clearNotificationHistory();
        setNotifications([]);
    };

    const formatTimestamp = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + 
               date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <View style={styles.headerTitleRow}>
                            <Bell color="#0A203F" size={20} />
                            <Text style={styles.title}>Notifications</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X color="#64748B" size={24} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView 
                        style={styles.scrollArea}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {loading ? (
                            <ActivityIndicator size="large" color="#0A203F" style={styles.loader} />
                        ) : notifications.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Info color="#94A3B8" size={48} />
                                <Text style={styles.emptyText}>No notifications yet</Text>
                            </View>
                        ) : (
                            notifications.map((item) => (
                                <View key={item.id} style={styles.notificationItem}>
                                    <View style={[
                                        styles.typeIndicator, 
                                        { backgroundColor: item.type === 'motor_on' ? '#DCFCE7' : '#FEE2E2' }
                                    ]}>
                                        <Info color={item.type === 'motor_on' ? '#16A34A' : '#EF4444'} size={16} />
                                    </View>
                                    <View style={styles.textContainer}>
                                        <Text style={styles.notifTitle}>{item.title}</Text>
                                        <Text style={styles.notifBody}>{item.body}</Text>
                                        <View style={styles.timeRow}>
                                            <Clock color="#94A3B8" size={12} />
                                            <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
                                        </View>
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>

                    {notifications.length > 0 && (
                        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                            <Trash2 color="#FFFFFF" size={18} />
                            <Text style={styles.clearButtonText}>Clear All</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: height * 0.7,
        paddingBottom: 30,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
        marginLeft: 10,
    },
    closeBtn: {
        padding: 4,
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    loader: {
        marginTop: 50,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 12,
        color: '#94A3B8',
        fontSize: 16,
    },
    notificationItem: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    typeIndicator: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    notifTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 4,
    },
    notifBody: {
        fontSize: 14,
        color: '#64748B',
        lineHeight: 20,
        marginBottom: 8,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timestamp: {
        fontSize: 12,
        color: '#94A3B8',
        marginLeft: 4,
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0A203F',
        marginHorizontal: 24,
        height: 52,
        borderRadius: 12,
        marginTop: 10,
    },
    clearButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default NotificationModal;
