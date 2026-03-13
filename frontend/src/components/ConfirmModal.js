import React from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, 
    Modal, Dimensions 
} from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const ConfirmModal = ({ 
    visible, 
    title, 
    message, 
    confirmText = 'Confirm', 
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    type = 'danger' // 'danger' or 'info'
}) => {
    const primaryColor = type === 'danger' ? '#EF4444' : '#0A203F';
    const lightBg = type === 'danger' ? '#FEE2E2' : '#F1F5F9';

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.card}>
                        {/* Icon Container */}
                        <View style={[styles.iconWrapper, { backgroundColor: lightBg }]}>
                            <AlertTriangle color={primaryColor} size={28} />
                        </View>

                        {/* Text Content */}
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.message}>{message}</Text>

                        {/* Actions */}
                        <TouchableOpacity 
                            style={[styles.primaryButton, { backgroundColor: primaryColor }]} 
                            onPress={onConfirm}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryButtonText}>{confirmText}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.secondaryButton} 
                            onPress={onCancel}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.secondaryButtonText}>{cancelText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: width * 0.85,
        maxWidth: 340,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        padding: 24,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    iconWrapper: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
        paddingHorizontal: 10,
    },
    primaryButton: {
        width: '100%',
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    secondaryButton: {
        width: '100%',
        height: 52,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#475569',
        fontSize: 15,
        fontWeight: '600',
    },
});

export default ConfirmModal;
