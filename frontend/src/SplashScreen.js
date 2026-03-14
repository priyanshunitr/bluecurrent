import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing } from 'react-native';

const SplashScreen = ({ onFinish }) => {
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Start rotation animation
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 1500,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        // Finish splash after 3 seconds
        const timer = setTimeout(() => {
            onFinish();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onFinish, rotateAnim]);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* Rotating Arc Loader */}
                <Animated.View style={[
                    styles.loaderArc,
                    { transform: [{ rotate: spin }] }
                ]} />
                
                {/* Centered Logo */}
                <Image 
                    source={require('./assets/Bluecurrentlogo.png')} 
                    style={styles.logo}
                    resizeMode="contain"
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: 250,
        height: 250,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: 80,
        height: 80,
    },
    loaderArc: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 4,
        borderColor: 'transparent',
        borderTopColor: '#0A203F',
        borderRightColor: '#0A203F',
        borderBottomColor: '#0A203F',
    }
});

export default SplashScreen;
