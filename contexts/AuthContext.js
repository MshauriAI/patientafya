import { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, logoutUser, signupUser, sendResetPassword } from '../services/authService';
import { getItem, setItem, removeItem } from '../utils/storage';
import { router, useRouter } from 'expo-router';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const loadUser = async () => {
            const userInfo = await getItem('userInfo');
            console.log("User from storage:", userInfo); // Add logging here to see if the token is retrieved
            if (user) {
                setUser({ userInfo });
            }
            setLoading(false);
        };
        loadUser();
    }, []);

    const signIn = async (email, password) => {
        const result = await loginUser(email, password);
        console.log("Login result:", result); // Log result of login attempt
        if (result.success) {
        //     await setItem('token', result.token);
        //     setUser({ token: result.token });
            return { success: true };
        }
        return { success: false, message: result.message };
    };

    const signUp = async (formData) => {
        console.log("Received data: ", formData)
        const result = await signupUser(formData);
        console.log("SignUp result:", result); // Log result of signup attempt
        if (result.success) {
            return { success: true };
        }
        return { success: false, message: result.message };
    };

    const resetPassword = async (email) => {
        console.log("Received Email: ", email);
        const result = await sendResetPassword(email);
        if (result.success) {
            return { success: true };
        }
        return { success: false, message: result.message };
    }

    const signOut = async () => {
        console.log("Signing out...");
        await removeItem('userInfo');
        await logoutUser();
        router.push("/auth/sign-in");
        setUser(null);
    };

    console.log("AuthContext value:", { user, loading }); // Log current context value

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
