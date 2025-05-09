import React, { useState } from 'react';
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
    useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';

export default function SignIn() {
    const router = useRouter();
    const { signIn } = useAuth();
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web';
    const isMobile = width < 768;
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [focusedField, setFocusedField] = useState(null);

    const handleSignIn = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }
        setIsLoading(true);
        setError('');

        const result = await signIn(email, password);
        setIsLoading(false);

        if (result.success) {
            router.push("(tabs)");
        } else {
            setError('Invalid email or password');
        }
    };

    const renderInputField = (label, value, onChangeText, options = {}) => {
        const inputStyles = [
            styles.input,
            focusedField === label && styles.inputFocused,
            options.isPassword && styles.passwordInput,
        ];

        return (
            <View style={[styles.inputContainer, options.containerStyle]}>
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
                {options.forgotPassword && (
                    <TouchableOpacity style={styles.forgotPasswordButton}
                        onPress={() => router.push("/auth/forgot-password")}
                    >
                        <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                    </TouchableOpacity>
                )}
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
                    <ScrollView 
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={[
                            styles.scrollContent,
                            isWeb && styles.webScrollContent
                        ]}
                    >
                        <View style={[
                            styles.contentContainer,
                            isWeb && !isMobile && styles.webContentContainer
                        ]}>
                            <View style={styles.header}>
                                <LinearGradient
                                    colors={['#3B82F6', '#2563EB']}
                                    style={styles.logoContainer}
                                >
                                    <Feather name="mail" size={24} color="white" />
                                </LinearGradient>
                                <Text style={styles.title}>Welcome back</Text>
                                <Text style={styles.subtitle}>We're so excited to see you again!</Text>
                            </View>

                            <View style={[
                                styles.card,
                                isWeb && !isMobile && styles.webCard
                            ]}>
                                {error && (
                                    <View style={styles.errorContainer}>
                                        <Feather name="alert-circle" size={20} color="#DC2626" />
                                        <Text style={styles.errorText}>{error}</Text>
                                    </View>
                                )}

                                {renderInputField('Email Address', email,
                                    setEmail,
                                    {
                                        placeholder: 'name@example.com',
                                        keyboardType: 'email-address',
                                        icon: 'mail'
                                    }
                                )}

                                {renderInputField('Password', password,
                                    setPassword,
                                    {
                                        isPassword: true,
                                        secureTextEntry: !showPassword,
                                        showPassword: showPassword,
                                        onTogglePassword: () => setShowPassword(!showPassword),
                                        placeholder: 'Enter your password',
                                        icon: 'lock',
                                        forgotPassword: true
                                    }
                                )}

                                <TouchableOpacity
                                    style={[styles.button, isLoading && styles.buttonDisabled]}
                                    onPress={handleSignIn}
                                    disabled={isLoading}
                                >
                                    <LinearGradient
                                        colors={['#3B82F6', '#2563EB']}
                                        style={styles.buttonGradient}
                                    >
                                        <View style={styles.buttonContent}>
                                            <Text style={styles.buttonText}>Sign in</Text>
                                            <Feather name="arrow-right" size={20} color="white" />
                                        </View>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.footer}>
                                <Text style={styles.footerText}>
                                    Don't have an account?{' '}
                                    <Text 
                                        style={styles.footerLink}
                                        onPress={() => router.push("/auth/sign-up")}
                                    >
                                        Sign up for free
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
    },
    safeArea: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 24,
    },
    webScrollContent: {
        minHeight: '100vh',
        justifyContent: 'center',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'web' ? 40 : 60,
        paddingBottom: 24,
    },
    webContentContainer: {
        maxWidth: 480,
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        alignItems: 'center',
        marginVertical: 24,
        paddingHorizontal: 16,
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
    webCard: {
        marginHorizontal: 0,
        padding: 24,
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
        ...(Platform.OS === 'web' ? {
            outlineStyle: 'none',
            height: 48
        } : {}),
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
        top: Platform.OS === 'web' ? 14 : 14,
        zIndex: 1,
    },
    passwordInput: {
        paddingRight: 45,
    },
    eyeIcon: {
        position: 'absolute',
        right: 12,
        top: Platform.OS === 'web' ? 14 : 14,
        padding: 4,
    },
    forgotPasswordButton: {
        alignSelf: 'flex-end',
        marginTop: 8,
        cursor: Platform.OS === 'web' ? 'pointer' : 'default',
    },
    forgotPasswordText: {
        color: '#2563EB',
        fontSize: 14,
        fontWeight: '500',
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
        ...(Platform.OS === 'web' ? {
            cursor: 'pointer'
        } : {})
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
        ...(Platform.OS === 'web' ? {
            cursor: 'pointer'
        } : {})
    },
});