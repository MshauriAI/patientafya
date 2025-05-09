import AsyncStorage from '@react-native-async-storage/async-storage';
// import Config from 'react-native-config';
import Constants from 'expo-constants';
import { Linking } from 'react-native';


/**
 * Fetches the count of upcoming appointments
 * @returns {Promise<number>} - The total number of upcoming appointments
 */
export const getUpcomingAppointmentsCount = async () => {
    const API_URL = Constants.expoConfig.extra.API_URL;
    try {
        const token = await AsyncStorage.getItem('token'); // Ensure token is stored in AsyncStorage
        if (!token) throw new Error("No token available");
        console.log("Me token", token);
        console.log(`${API_URL}}/api/v1.0/appointments/count`);

        const response = await fetch(`${API_URL}/api/v1.0/appointments/count`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) throw new Error(`Failed to fetch upcoming appointments count: ${response.status}`);
        const data = await response.json();
        // console.log("Count: ", data);
        return data.totalAppointments || 0;
    } catch (error) {
        // console.error("Error fetching upcoming appointments count:", error);
        return 0;
    }
};

/**
 * Fetches upcoming appointment details
 * @returns {Promise<Object|null>} - The upcoming appointment details or null if none
 */
export const getUpcomingAppointments = async () => {
    const API_URL = Constants.expoConfig.extra.API_URL;
    try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error("No token available");

        const response = await fetch(`${API_URL}/api/v1.0/appointments/upcoming`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) throw new Error("Failed to fetch upcoming appointments");

        const data = await response.json();
        // console.log("upcoming: ", data);
        return data.appointments || null;
    } catch (error) {
        // console.error("Error fetching upcoming appointments:", error);
        return null;
    }
};

/**
 * Fetches reports count
 * @returns {Promise<Object|null>} - The past appointment reports or null if none
 */
export const getReportsTotal = async () => {
    const API_URL = Constants.expoConfig.extra.API_URL;
    try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error("No token available");

        const response = await fetch(`${API_URL}/api/v1.0/reports/count`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) throw new Error("Failed to fetch reports count");

        const data = await response.json();
        // console.log("total reports: ", data);
        return data.totalReports || 0;
    } catch (error) {
        // console.error("Error fetching appointments:", error);
        return null;
    }
};

/**
 * Opens the meeting link if an appointment exists
 * @param {string} meetLink - The meeting link URL
 * @param {number} appointmentCount - The number of upcoming appointments
 */
export const handleMeetingLink = (meetLink) => {
    Linking.openURL(meetLink);
};



/**
 * Books an appointment
 * @returns {Promise<Object|null>} - The upcoming appointment details or null if none
 */
export const bookAppointment = async (appointmentDetails) => {
    const API_URL = Constants.expoConfig.extra.API_URL;
    
    try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error("No token available");

        const response = await fetch(`${API_URL}/api/v1.0/appointments`, {
            method: 'POST',
            body: JSON.stringify(appointmentDetails),
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        // Parse JSON response
        const responseData = await response.json();
        console.log("API Response:", responseData); // Debugging log

        if (!response.ok) {
            return { success: false, message: responseData.message || 'Failed to book appointment' };
        }

        return { success: true, message: responseData.message || "Appointment booked successfully!" };

    } catch (error) {
        console.error("Error booking an appointment: ", error);
        return { success: false, message: error.message || "An unexpected error occurred." };
    }
};
