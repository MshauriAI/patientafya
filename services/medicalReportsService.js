import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

/**
 * Fetches medical Reports
 * @returns {Promise<Object|null>} - The upcoming appointment details or null if none
 */
export const getMedicalReports = async (email) => {
    const API_URL = Constants.expoConfig.extra.API_URL;
    console.log("Email: ", email);
    try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error("No token available");

        const response = await fetch(`${API_URL}/api/v1.0/get-patient-reports`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) throw new Error("Failed to fetch reports");

        const data = await response.json();
        // console.log("reports: ", data.reports);
        return data.reports || [];
    } catch (error) {
        console.error("Error fetching reports:", error);
        return [];
    }
};