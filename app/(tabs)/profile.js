import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as Contacts from 'expo-contacts';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as SMS from 'expo-sms';
import * as jwt_decode from "jwt-decode"; // Fixed import statement
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Image,
    Modal,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import tw from "tailwind-react-native-classnames";
import { useAuth } from "../../contexts/AuthContext";
import { getUserProfile, setUserProfile, uploadProfileImage } from "../../services/profileService";

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

export default function Profile() {
    const router = useRouter();
    const { signOut } = useAuth();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState({ 
        first_name: '', 
        last_name: '',
        email: '', 
        phone_number: '', 
        gender: '', 
        date_of_birth: '', 
        address: '',
        national_id: '',
        blood_group: '',
        allergies: '',
        disabilities: '',
        chronic_illness: '',
        height: '',
        weight: '',
        marital_status: '',
        education_level: '',
        language: '',
        occupation: '',
    });
    const [editing, setEditing] = useState(false);
    const [expandedSection, setExpandedSection] = useState(null);
    const [imageUri, setImageUri] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [contactsModalVisible, setContactsModalVisible] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [scrollY] = useState(new Animated.Value(0));
    
    // Data for pickers
    const allergyOptions = ['None', 'Peanuts', 'Dairy', 'Gluten', 'Shellfish', 'Eggs', 'Soy', 'Tree nuts', 'Multiple allergies', 'Other'];
    const disabilityOptions = ['None', 'Physical', 'Visual', 'Hearing', 'Cognitive', 'Multiple disabilities', 'Other'];
    const heightOptions = Array.from({length: 111}, (_, i) => (i + 140).toString()); // 140cm to 250cm
    const weightOptions = Array.from({length: 151}, (_, i) => (i + 30).toString()); // 30kg to 180kg

    // Animation values
    const headerHeight = scrollY.interpolate({
      inputRange: [0, 100],
      outputRange: [180, 120],
      extrapolate: 'clamp'
    });

    const imageSize = scrollY.interpolate({
      inputRange: [0, 100],
      outputRange: [80, 50],
      extrapolate: 'clamp'
    });

    const headerOpacity = scrollY.interpolate({
      inputRange: [0, 60, 90],
      outputRange: [1, 0.3, 0],
      extrapolate: 'clamp'
    });

    const headerNameTranslate = scrollY.interpolate({
      inputRange: [0, 100],
      outputRange: [0, 20],
      extrapolate: 'clamp'
    });

    useEffect(() => {
        const checkToken = async () => {
          try {
            const token = await AsyncStorage.getItem("token");
            if (token) {
              try {
                // Using the correct import method for jwt-decode
                const decoded = jwt_decode.jwtDecode(token);
                const currentTime = Date.now() / 1000;
                
                if (decoded.exp < currentTime) {
                  await AsyncStorage.removeItem("token");
                  router.push('/auth/sign-in');
                  return;
                }
              } catch (decodeError) {
                console.error("Error decoding token", decodeError);
                await AsyncStorage.removeItem("token");
                router.push('/auth/sign-in');
                return;
              }
            }
          } catch (error) {
            console.error("Error validating token", error);
          }
        };
        
        checkToken();
      }, []);
    
    useEffect(() => {
        const getUserInfo = async () => {
            try {
                setLoading(true);
                const userInfo = await AsyncStorage.getItem('userInfo');
                if (userInfo) {
                    const parsedUser = JSON.parse(userInfo);
                    // setUser(parsedUser);
                
                    setImageUri(parsedUser.imageUri);
                    console.log(parsedUser);
                    let userProfile = await AsyncStorage.getItem('userProfile');
                    if (userProfile) {
                        userProfile = JSON.parse(userProfile);
                    } else {
                        userProfile = await getUserProfile();
                    }
                    setUser(userProfile);
                }
                setLoading(false);
            } catch (error) {
                console.error("Error retrieving user info:", error);
                setLoading(false);
            }
        };
        getUserInfo();
    }, []);

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
          setPasswordError('All fields are required');
          return;
        }
        
        if (newPassword !== confirmPassword) {
          setPasswordError('New passwords do not match');
          return;
        }
        
        if (newPassword.length < 6) {
          setPasswordError('New password must be at least 6 characters');
          return;
        }
        
        try {
          setIsChangingPassword(true);
          setPasswordError('');
          
          // First try to get user info which should have the user ID
          const userInfoString = await AsyncStorage.getItem('userInfo');
          if (!userInfoString) {
            throw new Error('User information not found. Please login again.');
          }
          
          const userInfo = JSON.parse(userInfoString);
          const userId = userInfo.id; // Get user ID if available
          
          // Get token using the same method as other API calls in the app
          const token = await AsyncStorage.getItem('token');
          
          if (!token) {
            throw new Error('Authentication token not found. Please login again.');
          }
          
          console.log('Using token:', token.substring(0, 10) + '...');
          
          // Use the correct API endpoint - check if it might need a version prefix
          const response = await fetch('https://api.afyamkononi.co.ke/api/patients/change-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              current_password: currentPassword,
              new_password: newPassword,
              // Include user ID if required by the API
              ...(userId && { user_id: userId })
            })
          });
          
          // Log the entire response for debugging
          const textResponse = await response.text();
          console.log('Change password full response:', textResponse);
          
          // Try to parse as JSON if possible
          let data;
          try {
            data = JSON.parse(textResponse);
          } catch (e) {
            data = { message: textResponse };
          }
          
          if (response.ok) {
            console.log('Password change successful');
            alert('Password changed successfully');
            
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setChangePasswordModalVisible(false);
          } else {
            console.error('Password change failed:', data);
            // Check for specific error messages from the API
            if (data.error === "Invalid credentials" || textResponse.includes("Invalid credentials")) {
              setPasswordError('Current password is incorrect');
            } else {
              setPasswordError(data.error || data.message || 'Failed to change password. Please try again.');
            }
          }
        } catch (error) {
          console.error('Error changing password:', error);
          setPasswordError(error.message || 'An error occurred');
        } finally {
          setIsChangingPassword(false);
        }
      };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText.toLowerCase() !== 'delete') {
          // Since Toast is not imported, use alert instead
          alert('Please type "delete" to confirm account deletion');
          return;
        }
    
        try {
          setIsDeleting(true);
          // Get the regular token (not access_token)
          const token = await AsyncStorage.getItem('token');
          
          if (!token) throw new Error('No authentication token found. Please login again.');
    
          // Validate token before using it
          try {
            const decoded = jwt_decode.jwtDecode(token);
            const currentTime = Date.now() / 1000;
            
            if (decoded.exp < currentTime) {
              throw new Error('Your session has expired. Please login again.');
            }
          } catch (decodeError) {
            console.error("Token validation error:", decodeError);
            throw new Error('Authentication error. Please login again.');
          }
    
          const response = await fetch(
            'https://api.afyamkononi.co.ke/api/v1.0/profile/delete',
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );
    
          // Get the response as text first
          const textResponse = await response.text();
          console.log('Delete account response:', textResponse);
          
          // Try to parse it as JSON if possible
          let responseData;
          try {
            responseData = JSON.parse(textResponse);
          } catch (e) {
            // If it's not valid JSON, use the text as is
            responseData = { message: textResponse };
          }
    
          if (!response.ok) {
            throw new Error(responseData.message || 'Failed to delete account');
          }
    
          // Clear all storage and redirect to sign in
          await AsyncStorage.clear();
          // Since Toast is not imported, use alert instead
          alert('Your account has been successfully deleted');
          
          // Navigate to login screen
          router.replace('/auth/sign-in');
        } catch (error) {
          console.error('Delete account error:', error);
          alert(error.message || 'Failed to delete account. Please try again.');
        } finally {
          setIsDeleting(false);
          setDeleteAccountModalVisible(false);
          setDeleteConfirmText('');
        }
      };

    const handleSave = async () => {
        try {
            setLoading(true);
            const updatedUser = { ...user, imageUri };
            await setUserProfile(updatedUser);
            setEditing(false);
            setLoading(false);
        } catch (error) {
            console.error("Error saving user info:", error);
            setLoading(false);
        }
    };

    const toggleSection = (section) => {
        setExpandedSection(expandedSection === section ? null : section);
    };
    
    const pickImage = async () => {
        if (!editing) return;

        console.log("Picking image");
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            alert("Sorry, we need camera roll permissions to make this work!");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        
        if (!result.canceled) {
            const selectedImageUri = result.assets[0].uri;
            setImageUri(selectedImageUri);
            const formData = new FormData();
            formData.append("file", {
                uri: selectedImageUri,
                name: `profile_${Date.now()}.jpg`,
                type: "image/jpeg",
            });

            const response = await uploadProfileImage(formData);

            if (response.success) {
                console.log("Upload successful:", data);
                alert("Image uploaded successfully!");
            } else {
                console.error("Upload failed:", data);
                alert("Upload failed: " + (data.error || "Unknown error"));
            }
        }
    };
    
    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const formattedDate = selectedDate.toISOString().split('T')[0];
            setUser({...user, date_of_birth: formattedDate});
        }
    };

    const getContactsPermission = async () => {
        setLoadingContacts(true);
        try {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status === 'granted') {
                const { data } = await Contacts.getContactsAsync({
                    fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name, Contacts.Fields.Image],
                    sort: Contacts.SortTypes.FirstName
                });
                
                if (data.length > 0) {
                    // Filter only contacts with phone numbers
                    const contactsWithPhones = data.filter(contact => 
                        contact.phoneNumbers && contact.phoneNumbers.length > 0
                    );
                    setContacts(contactsWithPhones);
                    setContactsModalVisible(true);
                } else {
                    Alert.alert("No Contacts Found", "We couldn't find any contacts on your device.");
                }
            } else {
                Alert.alert("Permission Required", "We need contacts permission to invite your friends.");
            }
        } catch (err) {
            console.error("Error getting contacts:", err);
            Alert.alert("Error", "Failed to access contacts. Please try again.");
        } finally {
            setLoadingContacts(false);
        }
    };

    const shareInvitationViaSMS = async (contact) => {
        try {
            const message = "Join me to book an appointment on AfyaMkononi! Download here: https://afyamkononi.co.ke/patient";
            if (contact?.phoneNumbers?.[0]?.number) {
                const isAvailable = await SMS.isAvailableAsync();
                if (isAvailable) {
                    // If SMS is available, use the SMS module
                    const { result } = await SMS.sendSMSAsync(
                        [contact.phoneNumbers[0].number],
                        message
                    );
                    if (result === 'sent') {
                        Alert.alert("Success", `Invitation sent to ${contact.name}`);
                    }
                } else {
                    // Use Share API as fallback
                    await Share.share({
                        message: `${message} (For: ${contact.name})`,
                    });
                }
                setContactsModalVisible(false);
            } else {
                Alert.alert("Error", "Selected contact doesn't have a valid phone number.");
            }
        } catch (error) {
            console.error("Error sending invitation:", error);
            Alert.alert("Error", "Failed to send invitation. Please try again.");
        }
    };

    const shareInvitation = async () => {
        try {
            const message = "Join me to book an appointment on AfyaMkononi! Download here: https://afyamkononi.co.ke/patient";
            
            if (Platform.OS === 'web') {
                if (navigator.share) {
                    try {
                        await navigator.share({
                            title: 'Join me on AfyaMkononi',
                            text: message,
                            url: 'https://afyamkononi.co.ke/patient'
                        });
                    } catch (error) {
                        if (error.name !== 'AbortError') {
                            Alert.alert('Sharing Error', 'Unable to share. Please try again.');
                        }
                    }
                } else {
                    Alert.alert(
                        'Invite Friends',
                        'Copy this message to share with your friends:\n\n' + message,
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { 
                                text: 'Copy Text', 
                                onPress: () => {
                                    if (navigator.clipboard) {
                                        navigator.clipboard.writeText(message)
                                            .then(() => Alert.alert('Success', 'Invitation message copied to clipboard!'))
                                            .catch(err => Alert.alert('Error', 'Failed to copy invitation message.'));
                                    }
                                } 
                            }
                        ]
                    );
                }
            } else {
                const result = await Share.share({
                    message: message,
                    title: 'Join me on AfyaMkononi',
                });
            }
        } catch (error) {
            console.error('Error sharing:', error);
            Alert.alert('Error', 'Could not share invitation. Please try again.');
        }
    };

    const renderProfileSections = () => {
        const sections = [
            { 
                title: 'Personal Information', 
                icon: 'person',
                color: '#3b82f6',
                fields: [
                    { label: 'First Name', value: user.first_name, icon: 'person', key: 'first_name' },
                    { label: 'Last Name', value: user.last_name, icon: 'people', key: 'last_name' },
                    { label: 'Date of Birth', value: user.date_of_birth, icon: 'cake', key: 'date_of_birth', isPicker: true, pickerType: 'date' },
                    { label: 'Gender', value: user.gender, icon: 'wc', key: 'gender', isDropdown: true, options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'] },
                    { label: 'National Id', value: user.national_id, icon: 'badge', key: 'national_id' }
                ]
            },
            { 
                title: 'Contact Details', 
                icon: 'contact-phone',
                color: '#06b6d4',
                fields: [
                    { label: 'Email Address', value: user.email, icon: 'email', key: 'email' },
                    { label: 'Phone Number', value: user.phone_number, icon: 'phone', key: 'phone_number' },
                    { label: 'Address', value: user.address, icon: 'location-on', key: 'address' }
                ]
            },
            { 
                title: 'Health Information', 
                icon: 'favorite',
                color: '#f43f5e',
                fields: [
                    { label: 'Blood Group', value: user.blood_group, icon: 'opacity', key: 'blood_group', isDropdown: true, options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
                    { label: 'Allergies', value: user.allergies, icon: 'healing', key: 'allergies', isPicker: true, options: allergyOptions },
                    { label: 'Disabilities', value: user.disabilities, icon: 'accessible', key: 'disabilities', isPicker: true, options: disabilityOptions },
                    { label: 'Chronic Illnesses', value: user.chronic_illness, icon: 'local-hospital', key: 'chronic_illness' },
                    { label: 'Height (cm)', value: user.height, icon: 'straighten', key: 'height', isPicker: true, options: heightOptions },
                    { label: 'Weight (kg)', value: user.weight, icon: 'fitness-center', key: 'weight', isPicker: true, options: weightOptions }
                ]
            },
            { 
                title: 'Social Information', 
                icon: 'group',
                color: '#8b5cf6',
                fields: [
                    { label: 'Marital Status', value: user.marital_status, icon: 'favorite-border', key: 'marital_status', isDropdown: true, options: ['Single', 'Married', 'Divorced', 'Widowed'] },
                    { label: 'Education Level', value: user.education_level, icon: 'school', key: 'education_level', isDropdown: true, options: ['High School', 'Associate\'s Degree', 'Bachelor\'s Degree', 'Master\'s Degree', 'Doctorate'] },
                    { label: 'Language', value: user.language, icon: 'translate', key: 'language', isDropdown: true, options: ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Arabic'] },
                    { label: 'Occupation', value: user.occupation, icon: 'work', key: 'occupation', isDropdown: true, options: ['Student', 'Employed', 'Self-employed', 'Unemployed', 'Retired'] }
                ]
            }
        ];

        return (
            <>
                {sections.map((section, index) => (
                    <View key={index} style={[
                        styles.sectionCard,
                        { marginBottom: 16 }
                    ]}>
                        <TouchableOpacity 
                            onPress={() => toggleSection(section.title)} 
                            style={[
                                styles.sectionHeader,
                                expandedSection === section.title && styles.expandedSectionHeader
                            ]}
                        >
                            <View style={tw`flex-row items-center`}>
                                <View style={[
                                    styles.sectionIconContainer,
                                    { backgroundColor: `${section.color}15` }
                                ]}>
                                    <MaterialIcons name={section.icon} size={20} color={section.color} />
                                </View>
                                <Text style={styles.sectionTitle}>{section.title}</Text>
                            </View>
                            <MaterialIcons 
                                name={expandedSection === section.title ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                                size={24} 
                                color="#94a3b8" 
                            />
                        </TouchableOpacity>
                        
                        {expandedSection === section.title && (
                            <View style={styles.sectionContent}>
                                {section.fields.map((field, fieldIndex) => (
                                    <View key={fieldIndex}>
                                        {editing ? (
                                            <View style={tw`mb-4`}>
                                                <Text style={styles.fieldLabel}>{field.label}</Text>
                                                {field.pickerType === 'date' ? (
                                                    <View>
                                                        <TouchableOpacity 
                                                            style={styles.datePickerButton}
                                                            onPress={() => setShowDatePicker(true)}
                                                        >
                                                            <MaterialIcons name="calendar-today" size={20} color="#60a5fa" style={tw`mr-2`} />
                                                            <Text style={styles.inputText}>{user.date_of_birth || 'Select date of birth'}</Text>
                                                        </TouchableOpacity>
                                                        {showDatePicker && (
                                                            <DateTimePicker
                                                                value={user.date_of_birth ? new Date(user.date_of_birth) : new Date()}
                                                                mode="date"
                                                                display="default"
                                                                onChange={onDateChange}
                                                            />
                                                        )}
                                                    </View>
                                                ) : field.isPicker || field.isDropdown ? (
                                                    <View style={styles.pickerContainer}>
                                                        <MaterialIcons name={field.icon} size={20} color="#60a5fa" style={tw`ml-3 mr-2`} />
                                                        <Picker
                                                            selectedValue={user[field.key]}
                                                            style={styles.picker}
                                                            onValueChange={(itemValue) => setUser({ ...user, [field.key]: itemValue })}
                                                        >
                                                            <Picker.Item label={`Select ${field.label}`} value="" />
                                                            {field.options.map((option, optionIndex) => (
                                                                <Picker.Item key={optionIndex} label={option} value={option} />
                                                            ))}
                                                        </Picker>
                                                    </View>
                                                ) : (
                                                    <View style={styles.inputContainer}>
                                                        <MaterialIcons name={field.icon} size={20} color="#60a5fa" style={tw`mr-2`} />
                                                        <TextInput 
                                                            style={styles.inputText}
                                                            placeholder={`Enter ${field.label}`} 
                                                            placeholderTextColor="#94a3b8"
                                                            value={user[field.key]} 
                                                            onChangeText={(text) => setUser({ ...user, [field.key]: text })}
                                                        />
                                                    </View>
                                                )}
                                            </View>
                                        ) : (
                                            <View style={styles.fieldRow}>
                                                <View style={[
                                                    styles.fieldIconContainer,
                                                    { backgroundColor: `${section.color}15` }
                                                ]}>
                                                    <MaterialIcons name={field.icon} size={18} color={section.color} />
                                                </View>
                                                <View style={tw`flex-1`}>
                                                    <Text style={styles.fieldLabelText}>{field.label}</Text>
                                                    <Text style={styles.fieldValueText}>{user[field.key] || 'Not set'}</Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                ))}
            </>
        );
    };

    const renderContactsModal = () => (
        <Modal
            visible={contactsModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setContactsModalVisible(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.contactsModalContent}>
                    <View style={styles.contactsHeader}>
                        <Text style={styles.contactsHeaderTitle}>Select Contact</Text>
                        <TouchableOpacity 
                            style={styles.closeButton}
                            onPress={() => setContactsModalVisible(false)}
                        >
                            <Ionicons name="close" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#4b5563" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search contacts..."
                            placeholderTextColor="#9ca3af"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    
                    <ScrollView style={styles.contactsList}>
                        {loadingContacts ? (
                            <ActivityIndicator size="large" color="#3b82f6" style={tw`my-4`} />
                        ) : contacts.length === 0 ? (
                            <Text style={styles.noContactsText}>No contacts found.</Text>
                        ) : (
                            contacts
                                .filter(contact => 
                                    contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    contact.phoneNumbers?.[0]?.number?.includes(searchQuery)
                                )
                                .map((contact, index) => (
                                    <TouchableOpacity 
                                        key={index} 
                                        style={styles.contactItem}
                                        onPress={() => shareInvitationViaSMS(contact)}
                                    >
                                        <View style={styles.contactImageContainer}>
                                            {contact.imageAvailable ? (
                                                <Image 
                                                    source={{ uri: contact.image.uri }} 
                                                    style={styles.contactImage} 
                                                />
                                            ) : (
                                                <View style={styles.contactInitials}>
                                                    <Text style={styles.initialsText}>
                                                        {contact.name?.charAt(0).toUpperCase() || '?'}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={tw`flex-1`}>
                                            <Text style={styles.contactName}>{contact.name}</Text>
                                            <Text style={styles.contactPhone}>
                                                {contact.phoneNumbers?.[0]?.number || 'No phone number'}
                                            </Text>
                                        </View>
                                        <TouchableOpacity style={styles.inviteButton}>
                                            <Text style={styles.inviteButtonText}>Invite</Text>
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                ))
                        )}
                    </ScrollView>
                    
                    <TouchableOpacity 
                        style={styles.generalShareButton}
                        onPress={() => {
                            setContactsModalVisible(false);
                            shareInvitation();
                        }}
                    >
                        <Ionicons name="share-social" size={20} color="white" style={tw`mr-2`} />
                        <Text style={styles.generalShareText}>Share Invitation Link</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    if (loading) {
        return (
            <View style={tw`flex-1 bg-gray-100 justify-center items-center`}>
                <ActivityIndicator size="large" color="#4B9CD3" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Animated Header */}
            <Animated.View style={[
                styles.headerContainer,
                { height: headerHeight }
            ]}>
                <LinearGradient 
                    colors={['#1e3a8a', '#3b82f6']} 
                    start={{ x: 0, y: 0 }} 
                    end={{ x: 1, y: 1 }} 
                    style={styles.gradient}
                >
                    <View style={styles.headerContent}>
                        <View style={styles.profileInfoContainer}>
                            <Animated.View style={[
                                styles.imageContainer,
                                { width: imageSize, height: imageSize }
                            ]}>
                                <Image
                                    source={imageUri ? { uri: imageUri } : require('../../assets/images/profileImage.jpg')}
                                    style={styles.profileImage}
                                />
                                {editing && (
                                    <TouchableOpacity 
                                        onPress={pickImage}
                                        style={styles.changePhotoButton}
                                    >
                                        <MaterialIcons name="camera-alt" size={14} color="white" />
                                    </TouchableOpacity>
                                )}
                            </Animated.View>
                            
                            <Animated.View style={{
                                opacity: headerOpacity,
                                transform: [{ translateY: headerNameTranslate }]
                            }}>
                                <Text style={styles.userName}>
                                    {user.first_name} {user.last_name}
                                </Text>
                                <Text style={styles.userEmail}>
                                    {user.email || 'No email set'}
                                </Text>
                                
                                <View style={styles.actionsContainer}>
                                    {editing ? (
                                        <TouchableOpacity 
                                            style={styles.editButton}
                                            onPress={handleSave}
                                        >
                                            <Text style={styles.editButtonText}>Save Changes</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity 
                                            style={styles.editButton}
                                            onPress={() => setEditing(true)}
                                        >
                                            <Text style={styles.editButtonText}>Edit Profile</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </Animated.View>
                        </View>
                    </View>
                </LinearGradient>
            </Animated.View>
            
            {/* Scrollable Content */}
            <Animated.ScrollView 
                style={styles.scrollView} 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
            >
                {/* Action Buttons Row */}
                <View style={styles.quickActionsContainer}>
                    <TouchableOpacity 
                        style={styles.quickActionButton}
                        onPress={() => getContactsPermission()}
                    >
                        <LinearGradient
                            colors={['#0891b2', '#06b6d4']}
                            style={styles.quickActionIconContainer}
                        >
                            <Ionicons name="person-add" size={22} color="white" />
                        </LinearGradient>
                        <Text style={styles.quickActionText}>Invite Friends</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.quickActionButton}
                        onPress={() => setChangePasswordModalVisible(true)}
                    >
                        <LinearGradient
                            colors={['#4f46e5', '#6366f1']}
                            style={styles.quickActionIconContainer}
                        >
                            <Ionicons name="key" size={22} color="white" />
                        </LinearGradient>
                        <Text style={styles.quickActionText}>Change Password</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.quickActionButton}
                        onPress={signOut}
                    >
                        <LinearGradient
                            colors={['#be123c', '#e11d48']}
                            style={styles.quickActionIconContainer}
                        >
                            <Ionicons name="log-out" size={22} color="white" />
                        </LinearGradient>
                        <Text style={styles.quickActionText}>Logout</Text>
                    </TouchableOpacity>
                </View>
                
                {/* Profile Info Sections */}
                {renderProfileSections()}
                
                {/* Delete Account Button */}
                <TouchableOpacity
                    style={styles.deleteAccountButton}
                    onPress={() => setDeleteAccountModalVisible(true)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" style={tw`mr-2`} />
                    <Text style={styles.deleteAccountText}>Delete My Account</Text>
                </TouchableOpacity>
            </Animated.ScrollView>
            
            {/* Modals */}
            {renderContactsModal()}
            
            {/* Change Password Modal */}
            <Modal
                visible={changePasswordModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setChangePasswordModalVisible(false)}
            >
                <View style={tw`flex-1 bg-black bg-opacity-60 justify-center items-center`}>
                    <View style={tw`w-11/12 bg-white rounded-3xl p-6`}>
                        <View style={tw`flex-row justify-between items-center mb-5`}>
                            <Text style={tw`text-gray-900 text-xl font-bold`}>Change Password</Text>
                            <TouchableOpacity 
                                style={tw`w-9 h-9 rounded-full bg-red-500 justify-center items-center`}
                                onPress={() => {
                                    setChangePasswordModalVisible(false);
                                    setCurrentPassword('');
                                    setNewPassword('');
                                    setConfirmPassword('');
                                    setPasswordError('');
                                }}
                            >
                                <Ionicons name="close" size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                        
                        {passwordError ? (
                            <View style={tw`flex-row items-center bg-red-100 p-3 rounded-xl mb-4`}>
                                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                                <Text style={tw`text-red-700 ml-2`}>{passwordError}</Text>
                            </View>
                        ) : null}
                        
                        <View style={tw`mb-4`}>
                            <Text style={tw`text-gray-600 text-sm font-medium mb-1`}>Current Password</Text>
                            <View style={tw`flex-row items-center border border-gray-200 rounded-xl p-3 bg-gray-50`}>
                                <Ionicons name="lock-closed" size={20} color="#60a5fa" style={tw`mr-2`} />
                                <TextInput
                                    style={tw`flex-1 text-gray-700`}
                                    secureTextEntry
                                    placeholderTextColor="#94a3b8"
                                    value={currentPassword}
                                    onChangeText={setCurrentPassword}
                                    placeholder="Enter current password"
                                />
                            </View>
                        </View>
                        
                        <View style={tw`mb-4`}>
                            <Text style={tw`text-gray-600 text-sm font-medium mb-1`}>New Password</Text>
                            <View style={tw`flex-row items-center border border-gray-200 rounded-xl p-3 bg-gray-50`}>
                                <Ionicons name="key" size={20} color="#60a5fa" style={tw`mr-2`} />
                                <TextInput
                                    style={tw`flex-1 text-gray-700`}
                                    secureTextEntry
                                    placeholderTextColor="#94a3b8"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    placeholder="Enter new password"
                                />
                            </View>
                        </View>
                        
                        <View style={tw`mb-4`}>
                            <Text style={tw`text-gray-600 text-sm font-medium mb-1`}>Confirm New Password</Text>
                            <View style={tw`flex-row items-center border border-gray-200 rounded-xl p-3 bg-gray-50`}>
                                <Ionicons name="checkmark-circle" size={20} color="#60a5fa" style={tw`mr-2`} />
                                <TextInput
                                    style={tw`flex-1 text-gray-700`}
                                    secureTextEntry
                                    placeholderTextColor="#94a3b8"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Confirm new password"
                                />
                            </View>
                        </View>
                        
                        <TouchableOpacity
                            style={tw`bg-blue-500 py-3.5 px-5 rounded-xl mt-2 flex-row items-center justify-center`}
                            onPress={handleChangePassword}
                            disabled={isChangingPassword}
                        >
                            {isChangingPassword ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <>
                                    <Ionicons name="save" size={20} color="white" style={tw`mr-2`} />
                                    <Text style={tw`text-white font-bold text-base`}>Update Password</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            
            {/* Delete Account Confirmation Modal */}
            <Modal
                visible={deleteAccountModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setDeleteAccountModalVisible(false)}
            >
                <View style={tw`flex-1 bg-black bg-opacity-60 justify-center items-center`}>
                    <View style={tw`w-11/12 bg-white rounded-3xl p-6`}>
                        <View style={tw`flex-row justify-between items-center mb-5`}>
                            <Text style={tw`text-gray-900 text-xl font-bold`}>Delete Account</Text>
                            <TouchableOpacity 
                                style={tw`w-9 h-9 rounded-full bg-red-500 justify-center items-center`}
                                onPress={() => {
                                    setDeleteAccountModalVisible(false);
                                    setDeleteConfirmText('');
                                }}
                            >
                                <Ionicons name="close" size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={tw`flex-row items-start bg-yellow-50 p-4 rounded-xl mb-4 border border-yellow-200`}>
                            <Ionicons name="warning" size={24} color="#f59e0b" />
                            <Text style={tw`text-yellow-800 ml-2 flex-1 text-sm leading-5`}>
                                This action cannot be undone. All your data will be permanently deleted from our servers.
                            </Text>
                        </View>
                        
                        <View style={tw`mb-4`}>
                            <Text style={tw`text-gray-600 text-sm font-medium mb-1`}>Type "delete" to confirm</Text>
                            <View style={tw`flex-row items-center border border-gray-200 rounded-xl p-3 bg-gray-50`}>
                                <Ionicons name="alert-circle" size={20} color="#ef4444" style={tw`mr-2`} />
                                <TextInput
                                    style={tw`flex-1 text-gray-700`}
                                    placeholderTextColor="#94a3b8"
                                    value={deleteConfirmText}
                                    onChangeText={setDeleteConfirmText}
                                    placeholder="delete"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>
                        
                        <TouchableOpacity
                            style={tw`bg-red-600 py-3.5 px-5 rounded-xl mt-2 flex-row items-center justify-center`}
                            onPress={handleDeleteAccount}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <>
                                    <Ionicons name="trash" size={20} color="white" style={tw`mr-2`} />
                                    <Text style={tw`text-white font-bold text-base`}>Delete My Account</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        overflow: 'hidden',
    },
    gradient: {
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
    },
    headerContent: {
        flex: 1,
        paddingHorizontal: 20,
        justifyContent: 'flex-end',
        paddingBottom: 15,
    },
    profileInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    imageContainer: {
        borderRadius: 40,
        borderWidth: 3,
        borderColor: 'white',
        overflow: 'hidden',
        marginRight: 15,
    },
    profileImage: {
        width: '100%',
        height: '100%',
    },
    changePhotoButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userName: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    userEmail: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginTop: 3,
    },
    actionsContainer: {
        flexDirection: 'row',
        marginTop: 10,
    },
    editButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    editButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 13,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 200, // Adjust based on header height
        paddingBottom: 30,
        paddingHorizontal: 16,
    },
    quickActionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    quickActionButton: {
        alignItems: 'center',
        width: width / 3 - 20,
    },
    quickActionIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    quickActionText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#4b5563',
        textAlign: 'center',
    },
    sectionCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    expandedSectionHeader: {
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    sectionIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#334155',
    },
    sectionContent: {
        padding: 16,
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    fieldIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    fieldLabelText: {
        fontSize: 12,
        color: '#64748b',
    },
    fieldValueText: {
        fontSize: 15,
        color: '#334155',
        fontWeight: '500',
        marginTop: 2,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#64748b',
        marginBottom: 6,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 12,
        backgroundColor: '#f8fafc',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 12,
        backgroundColor: '#f8fafc',
    },
    inputText: {
        flex: 1,
        color: '#334155',
        fontSize: 15,
    },
    pickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        backgroundColor: '#f8fafc',
    },
    picker: {
        flex: 1,
        marginLeft: -16,
    },
    deleteAccountButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        marginTop: 10,
        marginBottom: 20,
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    deleteAccountText: {
        color: '#ef4444',
        fontWeight: '600',
        fontSize: 15,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    contactsModalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
    },
    contactsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    contactsHeaderTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ef4444',
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 12,
        paddingVertical: 8,
        margin: 16,
        borderRadius: 10,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#1f2937',
    },
    contactsList: {
        maxHeight: '60%',
        paddingHorizontal: 16,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    contactImageContainer: {
        marginRight: 12,
    },
    contactImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    contactInitials: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#60a5fa',
        justifyContent: 'center',
        alignItems: 'center',
    },
    initialsText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    contactName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1f2937',
    },
    contactPhone: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    inviteButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#3b82f6',
        borderRadius: 20,
    },
    inviteButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 12,
    },
    noContactsText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#6b7280',
        fontSize: 16,
    },
    generalShareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3b82f6',
        padding: 16,
        margin: 16,
        borderRadius: 12,
    },
    generalShareText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
});