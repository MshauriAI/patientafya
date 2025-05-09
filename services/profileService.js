import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

/**
 * Fetches user Profile
 * @returns {Promise<Object|null>} - The user profile
 */
export const getUserProfile = async () => {
    const API_URL = Constants.expoConfig.extra.API_URL;
    try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error("No token available");
        const response = await fetch(`${API_URL}/api/v1.0/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) throw new Error("Failed to fetch profile");

        const data = await response.json();
        await AsyncStorage.setItem('userProfile', JSON.stringify(data));
        return data || {};
    } catch (error) {
        console.error("Error fetching profile: ", error);
        return [];
    }
};


/**
 * Updates User Profile
 * @returns {Promise<Object|null>} - The upcoming appointment details or null if none
 */
export const setUserProfile = async (profileData) => {
    const API_URL = Constants.expoConfig.extra.API_URL;
    try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error("No token available");

        const response = await fetch(`${API_URL}/api/v1.0/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(profileData),
        });

        const data = await response.json();
        if (response.ok) {
            await AsyncStorage.removeItem('userProfile');
            return { success: true };
        } else {
            return { success: false, message: data.message || 'failed to fetch profile' };
        }
    } catch (error) {
        console.error("Error fetching profile: ", error);
        return { 
            first_name: '', 
            last_name: '',
            email: '', 
            phone_number: '', 
            gender: '', 
            dob: '', 
            address: '',
            blood_group: '',
            allergies: '',
            disabilities: '',
            chronic_illness: '',
            height: '',
            national_id: '',
            weight: '',
            marital_status: '',
            education_level: '',
            language: '',
            occupation: '',
        };
    }
};


/**
 * Updates User Profile
 * @returns {Promise<Object|null>} - The upcoming appointment details or null if none
 */
export const uploadProfileImage = async (formData) => {
    const API_URL = Constants.expoConfig.extra.API_URL;
    console.log("Uploading to:", `${API_URL}/api/v1.0/profile/image`);
    try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error("No token available");

        const response = await fetch(`${API_URL}/api/v1.0/profile/image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                // 'Content-Type': 'multipart/form-data',
            },
            body: formData,
        });

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            if (response.ok) {
                console.log("Upload successful");
                return { success: true, imageUri: data.imageUri };
            } else {
                return { success: false, message: data.message || 'Failed to upload profile image' };
            }
        } else {
            const textResponse = await response.text();
            console.error("Unexpected response format:", textResponse);
            return { success: false, message: "Invalid server response format" };
        }
    } catch (error) {
        console.error("Error uploading profile image:", error);
        return { success: false, message: error.message };
    }
};
