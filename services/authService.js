import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export const loginUser = async (email, password) => {
    const API_URL = Constants.expoConfig.extra.API_URL;
    try {
        const response = await fetch(API_URL+'/api/v1.0/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, "role": "Patient" }),
        });

        const data = await response.json();
        if (response.ok) {
            console.log("User: ", data);
            await AsyncStorage.setItem('userInfo', JSON.stringify({
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                imageUri: data.imageUri,
                number: data.number,
                test: "test",
            }));
            await AsyncStorage.setItem('token', data.access_token);

            return { success: true };
        } else {
        return { success: false, message: data.message || 'Login failed' };
        }
    } catch (error) {
        console.log("URL: ", API_URL);
        return { success: false, message: 'Network error' };
    }
};

export const signupUser = async (formData) => {
    const API_URL = Constants.expoConfig.extra.API_URL;
    formData.role = "Patient";
    if (formData.date_of_birth) {
        formData.date_of_birth = new Date(formData.date_of_birth).toISOString().split('T')[0]; 
    }
    try {
        const response = await fetch(API_URL+'/api/v1.0/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        });

        const data = await response.json();
        if (response.ok) {
            return { success: true };
        } else {
        return { success: false, message: data.message || 'SignUp failed' };
        }
    } catch (error) {
        console.log("URL: ", API_URL);
        return { success: false, message: 'Network error' };
    }
};

export const sendResetPassword = async (email) => {
    const API_URL = Constants.expoConfig.extra.API_URL;
    try {
        const response = await fetch(API_URL+`/api/v1.0/reset-password?email=${email}`, {
        method: 'GET',
        headers: { 
            'Content-Type': 'application/json',
        },
        });

        if (response.ok) {
            return { success: true };
        } else {
            return { success: false, message: data.error || 'reset email was not sent, please try again' };
        }
    } catch (error) {
        console.log("URL: ", API_URL);
        return { success: false, message: 'Network error' };
    }
};

export const logoutUser = async () => {
    try {
        await AsyncStorage.removeItem('userInfo');
        await AsyncStorage.clear();
        await AsyncStorage.removeItem('userProfile');
        await AsyncStorage.clear();
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Logout failed' };
    }
}; 