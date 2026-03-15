import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.API_URL || 'http://10.0.2.2:3000'; // Fallback to local emulator

let onUnauthorized = () => {};

/**
 * Registry for unauthorized callback (implemented in App.tsx or similar)
 */
export const setUnauthorizedHandler = (handler) => {
    onUnauthorized = handler;
};

/**
 * ── HELPER ──
 */
const authenticatedFetch = async (endpoint, options = {}) => {
    const token = await AsyncStorage.getItem('userToken');
    
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        await logoutUser();
        onUnauthorized();
        throw new Error('Session expired. Please log in again.');
    }

    return response;
};

/**
 * ── AUTH SERVICES ──
 */

export const registerUser = async (username, password, phone) => {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, phone }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Registration failed');
        return data;
    } catch (error) {
        console.error('Registration Error:', error);
        throw error;
    }
};

export const loginUser = async (username, password) => {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Login failed');

        if (data.token) {
            await AsyncStorage.setItem('userToken', data.token);
            await AsyncStorage.setItem('username', data.username);
        }
        return data;
    } catch (error) {
        console.error('Login Error:', error);
        throw error;
    }
};

export const logoutUser = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('username');
};

export const changePassword = async (oldPassword, newPassword) => {
    try {
        const response = await authenticatedFetch('/auth/change-password', {
            method: 'PUT',
            body: JSON.stringify({ oldPassword, newPassword }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Password update failed');
        return data;
    } catch (error) {
        console.error('Change Password Error:', error);
        throw error;
    }
};

/**
 * ── MOTOR SERVICES ──
 */

export const getAuthToken = async () => {
  return await AsyncStorage.getItem('userToken');
};

export const fetchMyMotors = async () => {
  try {
    const response = await authenticatedFetch('/motors/my');
    if (!response.ok) throw new Error('Failed to fetch motors');

    const data = await response.json();
    return data.motors || [];
  } catch (error) {
    console.error('Fetch Error:', error);
    return [];
  }
};

export const fetchMotorStatus = async (hexcode) => {
  try {
    const response = await authenticatedFetch(`/motors/${hexcode}/status`);
    if (!response.ok) throw new Error('Failed to fetch motor status');

    return await response.json();
  } catch (error) {
    console.error('Fetch Status Error:', error);
    return null;
  }
};

export const linkMotor = async (hexcode, nickname) => {
    try {
        const response = await authenticatedFetch('/motors/link', {
            method: 'POST',
            body: JSON.stringify({ hexcode, nickname }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Linking failed');
        return data;
    } catch (error) {
        console.error('Link Motor Error:', error);
        throw error;
    }
};

export const renameMotor = async (hexcode, nickname) => {
    try {
        const response = await authenticatedFetch(`/motors/${hexcode}/rename`, {
            method: 'PUT',
            body: JSON.stringify({ nickname }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Renaming failed');
        return data;
    } catch (error) {
        console.error('Rename Motor Error:', error);
        throw error;
    }
};

export const unlinkMotor = async (hexcode) => {
    try {
        const response = await authenticatedFetch(`/motors/${hexcode}/unlink`, {
            method: 'DELETE',
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unlinking failed');
        return data;
    } catch (error) {
        console.error('Unlink Motor Error:', error);
        throw error;
    }
};

export const toggleMotorState = async (hexcode, motor, duration = 0) => {
    try {
        const response = await fetch(`${API_URL}/motors/${hexcode}/motor`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ motor, duration }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to toggle motor');
        return data;
    } catch (error) {
        console.error('Toggle Motor Error:', error);
        throw error;
    }
};

export const fetchSchedules = async (hexcode) => {
    try {
        const response = await authenticatedFetch(`/motors/${hexcode}/schedules`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch schedules');
        return data.schedules || [];
    } catch (error) {
        console.error('Fetch Schedules Error:', error);
        return [];
    }
};

export const updateSchedules = async (hexcode, schedules) => {
    try {
        const response = await authenticatedFetch(`/motors/${hexcode}/schedules`, {
            method: 'PUT',
            body: JSON.stringify({ schedules }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update schedules');
        return data;
    } catch (error) {
        console.error('Update Schedules Error:', error);
        throw error;
    }
};

export const clearMissedScheduleFlag = async (hexcode) => {
    try {
        const response = await authenticatedFetch(`/motors/${hexcode}/clear-missed`, {
            method: 'PUT',
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to clear missed flag');
        return data;
    } catch (error) {
        console.error('Clear Missed Flag Error:', error);
        throw error;
    }
};
