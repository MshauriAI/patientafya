import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export const sendLocationToAmbulance = async (phone_number, location) => {
    const API_URL = Constants.expoConfig.extra.API_URL;
    try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error("No token available");

        const response = await fetch(API_URL+'/api/v1.0/send-location', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ phone_number, location }),
        });

        if (!response.ok) throw new Error("Failed to send location");

        const data = await response.json();

        if (response.ok) {
            return { success: true };
        } else {
            return { success: false, message: data.message || 'sending location failed' };
        }
    } catch (error) {
        console.log("URL: ", API_URL);
        return { success: false, message: 'Network error' };
    }
};