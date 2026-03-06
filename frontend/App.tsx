import React, { useState } from 'react';
import { NativeRouter, Route, Routes } from 'react-router-native';
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

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NativeRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/motor/:id" element={<MotorDetails />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/timer" element={<Timer />} />
        </Routes>
      </NativeRouter>
    </SafeAreaProvider>
  );
}

export default App;
