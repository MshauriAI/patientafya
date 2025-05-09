import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    ScrollView,
    Dimensions,
    useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';

export default function SignUp() {
    const router = useRouter();
    const { signUp } = useAuth();
    const { width, height } = useWindowDimensions(); // Use window dimensions for responsiveness
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        // national_id: '',
        // date_of_birth: new Date(),
        // gender: '',
        password: '',
        confirm_password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [focusedField, setFocusedField] = useState(null);
    
    // Determine if we're in a mobile or desktop view
    const isDesktopView = width > 768;

    const handleSignUp = async () => {
        if (!validateForm()) return;
        
        setIsLoading(true);
        setError('');

        try {
            console.log("Data:: ", formData);
            const result = await signUp(formData);
            if (result.success) {
                setFormData({
                    first_name: '',
                    last_name: '',
                    email: '',
                    phone_number: '',
                    // national_id: '',
                    // date_of_birth: new Date(),
                    // gender: '',
                    password: '',
                    confirm_password: '',
                });
                router.push("/auth/sign-in");
            } else {
                setError('Sign up failed. Please try again.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const validateForm = () => {
        if (!formData.first_name || !formData.last_name || !formData.email || 
            !formData.phone_number || !formData.password || 
            !formData.confirm_password) {
            setError('Please fill in all fields');
            return false;
        }
        if (formData.password !== formData.confirm_password) {
            setError('Passwords do not match');
            return false;
        }
        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            return false;
        }
        return true;
    };

    const formatDate = (date) => {
        if (!date) return 'Select Date';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const renderInputField = (label, value, onChangeText, options = {}) => {
        const inputStyles = [
            styles.input,
            focusedField === label && styles.inputFocused,
            options.isPassword && styles.passwordInput,
        ];

        return (
            <View style={[
                styles.inputContainer, 
                options.containerStyle,
                isDesktopView && options.desktopContainerStyle
            ]}>
                <Text style={styles.label}>{label}</Text>
                <View style={styles.inputWrapper}>
                    {options.icon && (
                        <View style={styles.inputIcon}>
                            <Feather name={options.icon} size={18} color="#6B7280" />
                        </View>
                    )}
                    <TextInput
                        style={inputStyles}
                        value={value}
                        onChangeText={onChangeText}
                        placeholder={options.placeholder}
                        secureTextEntry={options.secureTextEntry}
                        keyboardType={options.keyboardType}
                        autoCapitalize={options.autoCapitalize || 'none'}
                        onFocus={() => setFocusedField(label)}
                        onBlur={() => setFocusedField(null)}
                    />
                    {options.isPassword && (
                        <TouchableOpacity
                            style={styles.eyeIcon}
                            onPress={options.onTogglePassword}
                        >
                            <Feather
                                name={options.showPassword ? 'eye-off' : 'eye'}
                                size={20}
                                color="#6B7280"
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <LinearGradient
            colors={['#EEF2FF', '#E0E7FF']}
            style={styles.container}
        >
            <StatusBar style="dark" />
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <View style={[
                        styles.header,
                        isDesktopView && styles.desktopHeader
                    ]}>
                        <LinearGradient
                            colors={['#3B82F6', '#2563EB']}
                            style={styles.logoContainer}
                        >
                            <Feather name="user-plus" size={24} color="white" />
                        </LinearGradient>
                        <Text style={styles.title}>Create an account</Text>
                        <Text style={styles.subtitle}>Join thousands of users today!</Text>
                    </View>
                    <ScrollView 
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={[
                            styles.scrollContent,
                            isDesktopView && styles.desktopScrollContent
                        ]}
                    >
                        <View style={[
                            styles.contentContainer,
                            isDesktopView && styles.desktopContentContainer
                        ]}>
                            <View style={[
                                styles.card,
                                isDesktopView && styles.desktopCard
                            ]}>
                                {error && (
                                    <View style={styles.errorContainer}>
                                        <Feather name="alert-circle" size={20} color="#DC2626" />
                                        <Text style={styles.errorText}>{error}</Text>
                                    </View>
                                )}

                                <View style={[
                                    styles.nameRow,
                                    isDesktopView && styles.desktopNameRow
                                ]}>
                                    {renderInputField('First Name', formData.first_name, 
                                        (text) => setFormData({...formData, first_name: text}),
                                        {
                                            containerStyle: styles.nameField,
                                            desktopContainerStyle: styles.desktopNameField,
                                            placeholder: 'John',
                                            autoCapitalize: 'words',
                                            icon: 'user'
                                        }
                                    )}
                                    {renderInputField('Last Name', formData.last_name,
                                        (text) => setFormData({...formData, last_name: text}),
                                        {
                                            containerStyle: styles.nameField,
                                            desktopContainerStyle: styles.desktopNameField,
                                            placeholder: 'Doe',
                                            autoCapitalize: 'words',
                                            icon: 'user'
                                        }
                                    )}
                                </View>

                                {renderInputField('Email Address', formData.email,
                                    (text) => setFormData({...formData, email: text}),
                                    {
                                        placeholder: 'name@example.com',
                                        keyboardType: 'email-address',
                                        icon: 'mail'
                                    }
                                )}

                                {renderInputField('Phone Number', formData.phone_number,
                                    (text) => setFormData({...formData, phone_number: text}),
                                    {
                                        placeholder: '+(254) 712345678',
                                        keyboardType: 'phone-pad',
                                        icon: 'phone'
                                    }
                                )}

                                {renderInputField('Password', formData.password,
                                    (text) => setFormData({...formData, password: text}),
                                    {
                                        isPassword: true,
                                        secureTextEntry: !showPassword,
                                        showPassword: showPassword,
                                        onTogglePassword: () => setShowPassword(!showPassword),
                                        placeholder: 'Min. 8 characters',
                                        icon: 'lock'
                                    }
                                )}

                                {renderInputField('Confirm Password', formData.confirm_password,
                                    (text) => setFormData({...formData, confirm_password: text}),
                                    {
                                        isPassword: true,
                                        secureTextEntry: !showConfirmPassword,
                                        showPassword: showConfirmPassword,
                                        onTogglePassword: () => setShowConfirmPassword(!showConfirmPassword),
                                        placeholder: 'Re-enter password',
                                        icon: 'lock'
                                    }
                                )}

                                <TouchableOpacity
                                    style={[
                                        styles.button, 
                                        isLoading && styles.buttonDisabled,
                                        isDesktopView && styles.desktopButton
                                    ]}
                                    onPress={handleSignUp}
                                    disabled={isLoading}
                                >
                                    <LinearGradient
                                        colors={['#3B82F6', '#2563EB']}
                                        style={styles.buttonGradient}
                                    >
                                        <View style={styles.buttonContent}>
                                            <Text style={styles.buttonText}>Create Account</Text>
                                            <Feather name="arrow-right" size={20} color="white" />
                                        </View>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.footer}>
                                <Text style={styles.footerText}>
                                    Already have an account?{' '}
                                    <Text 
                                        style={styles.footerLink}
                                        onPress={() => router.push("/auth/sign-in")}
                                    >
                                        Sign in instead
                                    </Text>
                                </Text>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        minHeight: '100vh', // Ensure full height on web
    },
    safeArea: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 24,
    },
    desktopScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    desktopContentContainer: {
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        alignItems: 'center',
        marginVertical: 40,
        paddingHorizontal: 16,
        justifyContent: 'center',
    },
    desktopHeader: {
        marginVertical: 30,
    },
    logoContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowColor: '#2563EB',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    desktopCard: {
        padding: 32,
        maxWidth: 700,
        alignSelf: 'center',
        width: '100%',
    },
    errorContainer: {
        backgroundColor: '#FEF2F2',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    errorText: {
        color: '#DC2626',
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: -8,
        flexWrap: 'wrap', // Allow wrapping on smaller screens
    },
    desktopNameRow: {
        flexWrap: 'nowrap', // Don't wrap on desktop
    },
    nameField: {
        flex: 0.48,
        minWidth: '45%', // Ensure minimum width on all devices
    },
    desktopNameField: {
        minWidth: '48%', // Slightly wider on desktop
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
        letterSpacing: 0.25,
    },
    inputWrapper: {
        position: 'relative',
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        paddingLeft: 40,
        color: '#1F2937',
    },
    inputFocused: {
        borderColor: '#2563EB',
        backgroundColor: '#FFFFFF',
        shadowColor: '#2563EB',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    inputIcon: {
        position: 'absolute',
        left: 12,
        top: 14,
        zIndex: 1,
    },
    passwordInput: {
        paddingRight: 45,
    },
    eyeIcon: {
        position: 'absolute',
        right: 12,
        top: 14,
        padding: 4,
    },
    button: {
        borderRadius: 8,
        overflow: 'hidden',
        marginTop: 8,
        shadowColor: '#2563EB',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 4.65,
        elevation: 8,
    },
    desktopButton: {
        maxWidth: 300,
        alignSelf: 'center',
    },
    buttonGradient: {
        padding: 16,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    footer: {
        marginTop: 8,
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    footerText: {
        fontSize: 14,
        color: '#6B7280',
    },
    footerLink: {
        color: '#2563EB',
        fontWeight: '600',
    },
});