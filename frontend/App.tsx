import React, { useState } from 'react';
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
import notifee, { EventType } from '@notifee/react-native';

import Timer from './src/features/Timer';
import Schedule from './src/features/Schedule';

notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification } = detail;
  console.log(
    `[Background Event] Type: ${type}, Notification ID: ${notification?.id}`,
  );

  if (
    type === EventType.DELIVERED ||
    type === EventType.TRIGGER_NOTIFICATION_CREATED
  ) {
    console.log('Background task active. Attempting motor update...');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch('http://10.0.2.2:3000/update/motor', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ motor: true }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();
      console.log('Background motor update success:', data);
    } catch (e: any) {
      console.error(
        'Background motor update failed:',
        e.name === 'AbortError' ? 'Timeout' : e.message,
      );
    }
  }
});

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <Schedule />
    </SafeAreaProvider>
  );
}

export default App;
