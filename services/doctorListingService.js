import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';


/**
 * Fetches doctors details
 * @returns {Promise<Object|null>} - The doctors' details or [] if none
 */
export const getDoctors = async () => {
    const API_URL = Constants.expoConfig.extra.API_URL;
    try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error("No token available");

        const response = await fetch(`${API_URL}/doctors`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) throw new Error("Failed to fetch doctors");

        const data = await response.json();
        console.log("Doctors: ", data);
        return data.doctors || null;
    } catch (error) {
        console.error("Error fetching doctors: ", error);
        return null;
    }
};


/**
 * Fetches doctor specializations
 * @returns {Promise<Object|null>} - doctor specializations
 */
export const getSpecializations = async () => {
    const API_URL = Constants.expoConfig.extra.API_URL;
    try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error("No token available");

        const response = await fetch(`${API_URL}/api/v1.0/specializations`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) throw new Error("Failed to fetch doctors' specialization");

        const data = await response.json();
        console.log("specializations: ", data);
        return data.specializations || [];
    } catch (error) {
        console.error("Error fetching doctors' specializations: ", error);
        return [];
    }
};