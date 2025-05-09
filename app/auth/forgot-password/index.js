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
    Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';

export default function ForgotPassword() {
    const router = useRouter();
    const { resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [focusedField, setFocusedField] = useState(null);
    const windowWidth = Dimensions.get('window').width;
    const isWeb = Platform.OS === 'web';

    const handleResetPassword = async () => {
        if (!email) {
            setError('Please enter your email address');
            return;
        }
        setIsLoading(true);
        setError('');
        setSuccess(false); // Reset success state

        try {
            console.log("Sending Email to: ", email);
            
            const result = await resetPassword(email);

            if (result.success) {
                setSuccess(true);
                setError('');
                setEmail('');
            } else {
                setSuccess(false);
                setError(result.message || 'Failed to send reset instructions');
            }
        } catch (err) {
            setSuccess(false);
            setError('An error occurred while sending reset instructions');
        } finally {
            setIsLoading(false);
        }
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
                        contentContainerStyle={styles.scrollContent}
                    >
                        <View style={[styles.contentContainer, isWeb && styles.webContentContainer]}>
                            <TouchableOpacity 
                                style={[styles.backButton, isWeb && styles.webBackButton]}
                                onPress={() => router.back()}
                            >
                                <Feather name="arrow-left" size={24} color="#374151" />
                            </TouchableOpacity>

                            <View style={styles.header}>
                                <LinearGradient
                                    colors={['#3B82F6', '#2563EB']}
                                    style={styles.logoContainer}
                                >
                                    <Feather name="key" size={24} color="white" />
                                </LinearGradient>
                                <Text style={styles.title}>Reset password</Text>
                                <Text style={styles.subtitle}>
                                    Enter your email address and we'll send you instructions to reset your password.
                                </Text>
                            </View>

                            <View style={[styles.card, isWeb && { width: Math.min(windowWidth * 0.8, 480) }]}>
                                {error && (
                                    <View style={styles.errorContainer}>
                                        <Feather name="alert-circle" size={20} color="#DC2626" />
                                        <Text style={styles.errorText}>{error}</Text>
                                    </View>
                                )}

                                {success && (
                                    <View style={styles.successContainer}>
                                        <Feather name="check-circle" size={20} color="#059669" />
                                        <Text style={styles.successText}>
                                            Reset instructions have been sent to your email address.
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Email Address</Text>
                                    <View style={styles.inputWrapper}>
                                        <View style={styles.inputIcon}>
                                            <Feather name="mail" size={18} color="#6B7280" />
                                        </View>
                                        <TextInput
                                            style={[
                                                styles.input,
                                                focusedField === 'email' && styles.inputFocused,
                                                isWeb && styles.webInput
                                            ]}
                                            value={email}
                                            onChangeText={setEmail}
                                            placeholder="name@example.com"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            onFocus={() => setFocusedField('email')}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.button, isLoading && styles.buttonDisabled]}
                                    onPress={handleResetPassword}
                                    disabled={isLoading}
                                >
                                    <LinearGradient
                                        colors={['#3B82F6', '#2563EB']}
                                        style={styles.buttonGradient}
                                    >
                                        <View style={styles.buttonContent}>
                                            <Text style={styles.buttonText}>
                                                {isLoading ? 'Sending...' : 'Send reset instructions'}
                                            </Text>
                                            <Feather 
                                                name={isLoading ? 'loader' : 'send'} 
                                                size={20} 
                                                color="white" 
                                            />
                                        </View>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.footer}>
                                <Text style={styles.footerText}>
                                    Remember your password?{' '}
                                    <Text 
                                        style={[styles.footerLink, isWeb && styles.webFooterLink]}
                                        onPress={() => router.back()}
                                    >
                                        Back to sign in
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
        ...(Platform.OS === 'web' && {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }),
    },
    backButton: {
        padding: 16,
        position: 'absolute',
        top: 20,
        left: 0,
        zIndex: 1,
    },
    webBackButton: {
        top: 0,
        left: 0,
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingTop: 60, // Space for back button
        paddingBottom: 24,
        width: '100%',
    },
    webContentContainer: {
        maxWidth: 600,
        alignSelf: 'center',
        paddingTop: 40,
        minHeight: '100vh',
        position: 'relative',
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
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
        textAlign: 'center',
        paddingHorizontal: 24,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 16,
        marginBottom: 24,
        alignSelf: 'center',
        maxWidth: 480,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
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
    successContainer: {
        backgroundColor: '#ECFDF5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    successText: {
        color: '#059669',
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
    },
    webInput: {
        outlineStyle: 'none',
        height: 48,
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
    webFooterLink: {
        cursor: 'pointer',
    }
});