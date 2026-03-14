import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const SplashScreen = ({ onFinish }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 4,
                useNativeDriver: true,
            })
        ]).start();

        const timer = setTimeout(() => {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }).start(() => onFinish());
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            <Animated.View style={[
                styles.logoContainer,
                { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
            ]}>
                <Image 
                    source={require('./assets/Bluecurrentlogo.png')} 
                    style={styles.logo}
                    resizeMode="contain"
                />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A203F', // Brand Navy
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        width: 120,
        height: 120,
        backgroundColor: '#FFFFFF',
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 15,
    },
    logo: {
        width: 80,
        height: 80,
    }
});

export default SplashScreen;
