import React, { useEffect } from 'react';
import { View, Image, StyleSheet, ActivityIndicator } from 'react-native';

const SplashScreen = ({ onFinish }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onFinish();
        }, 2000);
        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Image 
                    source={require('./assets/Bluecurrentlogo.png')} 
                    style={styles.logo}
                    resizeMode="contain"
                />
                <ActivityIndicator 
                    size="large" 
                    color="#0A203F" 
                    style={styles.loader} 
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
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: 120,
        height: 120,
    },
    loader: {
        position: 'absolute',
    }
});

export default SplashScreen;
