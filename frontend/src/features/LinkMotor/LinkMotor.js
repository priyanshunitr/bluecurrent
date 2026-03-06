import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, SafeAreaView, TextInput, 
    TouchableOpacity, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import { Cpu, ChevronLeft, Link as LinkIcon } from 'lucide-react-native';
import { useNavigate } from 'react-router-native';
import { linkMotor } from '../../services/api';

const LinkMotor = () => {
    const navigate = useNavigate();
    const [hexcode, setHexcode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLink = async () => {
        if (!hexcode) {
            Alert.alert('Error', 'Please enter a hexcode');
            return;
        }

        setLoading(true);
        try {
            await linkMotor(hexcode);
            Alert.alert('Success', 'Motor linked successfully!', [
                { text: 'OK', onPress: () => navigate('/') }
            ]);
        } catch (error) {
            Alert.alert('Linking Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigate(-1)}>
                    <ChevronLeft color="#0F172A" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add New Motor</Text>
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <View style={styles.card}>
                    <View style={styles.iconCircle}>
                        <Cpu color="#FFFFFF" size={40} />
                    </View>
                    <Text style={styles.cardTitle}>Link Your Device</Text>
                    <Text style={styles.cardSubtitle}>
                        Enter the unique hexcode printed on your motor control box.
                    </Text>

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
        backgroundColor: '#050B1B',
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
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    inputWrapper: {
        width: '100%',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 24,
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
        backgroundColor: '#050B1B',
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
