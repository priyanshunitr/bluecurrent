import React, { useState, useEffect } from 'react';
import { NativeRouter, Route, Routes, useNavigate } from 'react-router-native';
import {
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  TouchableOpacity,
  Text,
  ScrollView,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Timer from './src/features/Timer';
import Schedule from './src/features/Schedule';
import Home from './src/features/Home';
import MotorDetails from './src/features/MotorDetails';
import Login from './src/features/Auth/Login';
import Register from './src/features/Auth/Register';
import LinkMotor from './src/features/LinkMotor/LinkMotor';
import Profile from './src/features/Profile/Profile';
import { setUnauthorizedHandler } from './src/services/api';

const AuthListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      navigate('/login');
    });
  }, [navigate]);

  return null;
};

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NativeRouter>
        <AuthListener />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/motor/:id" element={<MotorDetails />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/timer" element={<Timer />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/link-motor" element={<LinkMotor />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </NativeRouter>
    </SafeAreaProvider>
  );
}

export default App;
