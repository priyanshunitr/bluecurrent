import React from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, 
    Modal, Dimensions 
} from 'react-native';
import { Check, AlertTriangle } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const StatusModal = ({ 
    visible, 
    type = 'success', 
    title, 
    message, 
    buttonText, 
    onConfirm,
    onClose 
}) => {
    const isSuccess = type === 'success';
    const mainColor = isSuccess ? '#006e28ff' : '#af0303ff';
    const bgColor = isSuccess ? '#DCFCE7' : '#FEE2E2';

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.card}>
                        {/* Icon */}
                        <View style={[styles.iconWrapper, { backgroundColor: bgColor }]}>
                            {isSuccess ? (
                                <Check color={mainColor} size={28} strokeWidth={3} />
                            ) : (
                                <AlertTriangle color={mainColor} size={28} strokeWidth={2} />
                            )}
                        </View>

                        {/* Text */}
                        <Text style={[styles.title, { color: isSuccess ? '#1E293B' : '#1E293B' }]}>
                            {title || (isSuccess ? 'Success' : 'Error')}
                        </Text>
                        
                        <Text style={styles.message}>
                            {message || (isSuccess ? 'Operation completed successfully.' : 'Something went wrong.')}
                        </Text>

                        {/* Button */}
                        <TouchableOpacity 
                            style={[styles.button, { backgroundColor: mainColor }]} 
                            onPress={onConfirm || onClose}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.buttonText}>
                                {buttonText || (isSuccess ? 'Done' : 'OK')}
                            </Text>
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
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
    },
    iconWrapper: {
        width: 56,
        height: 56,
        borderRadius: 28,
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
    button: {
        width: '100%',
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});

export default StatusModal;
