import React from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, 
    Modal, Animated, Dimensions 
} from 'react-native';
import { Check, AlertTriangle, X } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

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
    const mainColor = isSuccess ? '#22C55E' : '#EF4444';
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
                    {/* Main Content Card */}
                    <View style={styles.card}>
                        {/* Icon Section */}
                        <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
                            {isSuccess ? (
                                <View style={styles.successIconWrapper}>
                                    <View style={[styles.circle, { borderColor: mainColor }]}>
                                        <Check color={mainColor} size={40} strokeWidth={3} />
                                    </View>
                                    {/* Decorative dots (confetti-ish) */}
                                    <View style={[styles.dot, { top: 0, left: '20%', backgroundColor: mainColor, opacity: 0.4 }]} />
                                    <View style={[styles.dot, { top: '20%', right: 0, backgroundColor: mainColor, opacity: 0.6 }]} />
                                    <View style={[styles.dot, { bottom: '10%', left: 0, backgroundColor: mainColor, opacity: 0.5 }]} />
                                    <View style={[styles.dot, { top: '10%', right: '15%', backgroundColor: mainColor, opacity: 0.3 }]} />
                                </View>
                            ) : (
                                <View style={styles.errorIconWrapper}>
                                    <AlertTriangle color={mainColor} size={60} strokeWidth={1.5} />
                                </View>
                            )}
                        </View>

                        {/* Text Section */}
                        <Text style={[styles.title, { color: mainColor }]}>
                            {title || (isSuccess ? 'SUCCESS!' : 'OH NO...')}
                        </Text>
                        
                        <Text style={styles.message}>
                            {message || (isSuccess ? 'Operation completed successfully.' : 'Something went wrong, let\'s try again.')}
                        </Text>

                        {/* Button Section */}
                        <TouchableOpacity 
                            style={[styles.button, { backgroundColor: mainColor }]} 
                            onPress={onConfirm || onClose}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.buttonText}>
                                {buttonText || (isSuccess ? 'DONE' : 'TRY AGAIN')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Optional Close Button at top right of overlay or modal */}
                    {onClose && (
                        <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
                            <X color="#94A3B8" size={24} />
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
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: width * 0.85,
        maxWidth: 340,
        position: 'relative',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        padding: 30,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        overflow: 'hidden',
    },
    successIconWrapper: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    circle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        position: 'absolute',
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    errorIconWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 30,
        paddingHorizontal: 10,
    },
    button: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1,
    },
    closeIcon: {
        position: 'absolute',
        top: -40,
        right: 0,
        padding: 10,
    }
});

export default StatusModal;
