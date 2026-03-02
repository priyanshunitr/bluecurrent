import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@bluecurrent_schedules';

export async function loadSchedules() {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.error('Failed to load schedules:', e);
    return [];
  }
}

export async function saveSchedules(schedules) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
  } catch (e) {
    console.error('Failed to save schedules:', e);
  }
}
