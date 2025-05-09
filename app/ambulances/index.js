import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Linking,
    Platform,
    Alert,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { sendLocationToAmbulance } from '../../services/emergencyService';
import { LinearGradient } from 'expo-linear-gradient';
import tw from 'tailwind-react-native-classnames';
import { useRouter } from 'expo-router';
import * as jwt_decode from "jwt-decode"; // Fixed import statement
import AsyncStorage from "@react-native-async-storage/async-storage";

// Dummy hospital and ambulance data
const hospitalData = [
    {
        id: 1,
        name: "Juja Modern Hospital",
        coordinate: { latitude: -1.1022, longitude: 37.0127 },
        ambulances: [
            {
                id: 101,
                vehicleReg: "KDD 123K",
                type: "Advanced Life Support",
                phone: "+254701888380",
                status: "Available"
            },
            {
                id: 102,
                vehicleReg: "KDE 456L",
                type: "Basic Life Support",
                phone: "+254113402160",
                status: "Available"
            }
        ]
    },
    {
        id: 2,
        name: "Thika Level 5 Hospital",
        coordinate: { latitude: -1.0964, longitude: 37.0372 },
        ambulances: [
            {
                id: 201,
                vehicleReg: "KDF 789M",
                type: "Critical Care",
                phone: "+254113402160",
                status: "Available"
            }
        ]
    },
    {
        id: 3,
        name: "Ruiru Sub-County Hospital",
        coordinate: { latitude: -1.1492, longitude: 36.9657 },
        ambulances: [
            {
                id: 301,
                vehicleReg: "KDG 321N",
                type: "Basic Life Support",
                phone: "+254700000004",
                status: "Available"
            }
        ]
    },
    {
        id: 4,
        name: "St. Teresa Medical Center",
        coordinate: { latitude: -1.0897, longitude: 37.0225 },
        ambulances: [
            {
                id: 401,
                vehicleReg: "KDH 654P",
                type: "Advanced Life Support",
                phone: "+254700000005",
                status: "Available"
            }
        ]
    },
    {
        id: 5,
        name: "Kiambu County Referral Hospital",
        coordinate: { latitude: -1.1703, longitude: 36.9726 },
        ambulances: [
            {
                id: 501,
                vehicleReg: "KDJ 987Q",
                type: "Critical Care",
                phone: "+254700000006",
                status: "Available"
            },
            {
                id: 502,
                vehicleReg: "KDK 345R",
                type: "Basic Life Support",
                phone: "+254700000007",
                status: "Available"
            }
        ]
    },
    {
        id: 6,
        name: "Thika Level 5 Hospital",
        coordinate: { latitude: -1.0964, longitude: 37.0372 },
        ambulances: [
            {
                id: 601,
                vehicleReg: "KDF 789M",
                type: "Critical Care",
                phone: "+254113402160",
                status: "Available"
            }
        ]
    },
    {
        "id": 7,
        "name": "KMA Upper Hill",
        "coordinate": { "latitude": -1.3002, "longitude": 36.8111 },
        "ambulances": [
            {
                "id": 702,
                "vehicleReg": "KBC 456Z",
                "type": "Basic Life Support",
                "phone": "+254113402160",
                "status": "Available"
            }
        ]
    }
];

// Function to calculate distance between two coordinates in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

export default function App() {
    const [selectedAmbulance, setSelectedAmbulance] = useState(null);
    const [location, setLocation] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [isSharing, setIsSharing] = useState(false); // Changed from isSendingLocation to better reflect one-time action
    const [isLoading, setIsLoading] = useState(true);
    const [nearbyAmbulances, setNearbyAmbulances] = useState([]);
    const [locationShareStatus, setLocationShareStatus] = useState(null); // Web feedback state
    const router = useRouter();
    
    // Check if we're on a mobile device
    const isMobileDevice = Platform.OS === 'android' || Platform.OS === 'ios';
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

    const updateNearbyAmbulances = (currentLocation) => {
        try {
            const MAX_DISTANCE = 10; // 10 kilometers radius
            let available = [];

            hospitalData.forEach(hospital => {
                const distance = calculateDistance(
                    currentLocation.coords.latitude,
                    currentLocation.coords.longitude,
                    hospital.coordinate.latitude,
                    hospital.coordinate.longitude
                );

                if (distance <= MAX_DISTANCE) {
                    hospital.ambulances.forEach(ambulance => {
                        available.push({
                            ...ambulance,
                            hospital: hospital.name,
                            coordinate: hospital.coordinate,
                            distance: distance.toFixed(1)
                        });
                    });
                }
            });

            setNearbyAmbulances(available.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance)));
            setIsLoading(false);
        } catch (error) {
            console.error('Error updating nearby ambulances:', error);
            setErrorMsg('Unable to update nearby ambulances');
            setIsLoading(false);
        }
    };

    const initializeLocation = async () => {
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Please enable location services to find nearby ambulances');
                setIsLoading(false);
                return;
            }

            let location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High
            });
            
            setLocation(location);
            updateNearbyAmbulances(location);
            startLocationWatching();
        } catch (error) {
            console.error('Location initialization error:', error);
            setErrorMsg('Unable to access location services. Please ensure location is enabled.');
            setIsLoading(false);
        }
    };

    const startLocationWatching = async () => {
        try {
            const locationSubscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 5000,
                    distanceInterval: 10,
                },
                (newLocation) => {
                    setLocation(newLocation);
                    updateNearbyAmbulances(newLocation);
                }
            );

            return () => {
                if (locationSubscription) {
                    locationSubscription.remove();
                }
            };
        } catch (error) {
            console.error('Location watching error:', error);
            setErrorMsg('Unable to track location updates');
        }
    };

    const handleCall = (phoneNumber) => {
        if (!isMobileDevice) {
            setLocationShareStatus({
                type: 'warning',
                message: 'Calling is only available on mobile devices'
            });
            setTimeout(() => setLocationShareStatus(null), 3000);
            return;
        }
        
        let phoneUrl = `tel:${phoneNumber}`;
        Linking.openURL(phoneUrl).catch((err) => {
            if (isMobileDevice) {
                Alert.alert('Error', 'Unable to make the call. Please try again.');
            } else {
                setLocationShareStatus({
                    type: 'error',
                    message: 'Unable to make the call. Please try again.'
                });
                setTimeout(() => setLocationShareStatus(null), 3000);
            }
        });
    };

    const sendLocation = async (ambulance) => {
        try {
            setIsSharing(true);
            let currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    
            if (!currentLocation) {
                if (isMobileDevice) {
                    Alert.alert('Error', 'Unable to get your current location');
                } else {
                    setLocationShareStatus({
                        type: 'error',
                        message: 'Unable to get your current location'
                    });
                    setTimeout(() => setLocationShareStatus(null), 3000);
                }
                setIsSharing(false);
                return;
            }
    
            const { latitude, longitude } = currentLocation.coords;
            const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    
            // Call the function to send SMS with location (one-time message)
            const response = await sendLocationToAmbulance(ambulance.phone, googleMapsUrl);
    
            if (response.success) {
                const successMessage = `Your location has been sent to ambulance ${ambulance.vehicleReg}`;
                if (isMobileDevice) {
                    Alert.alert('Location Shared', successMessage, [{ text: 'OK' }]);
                } else {
                    setLocationShareStatus({
                        type: 'success',
                        message: successMessage
                    });
                    setTimeout(() => setLocationShareStatus(null), 3000);
                }
            } else {
                if (isMobileDevice) {
                    Alert.alert('Error', 'Failed to send location. Please try again.');
                } else {
                    setLocationShareStatus({
                        type: 'error',
                        message: 'Failed to send location. Please try again.'
                    });
                    setTimeout(() => setLocationShareStatus(null), 3000);
                }
            }
        } catch (error) {
            console.error('Error sending location:', error);
            if (isMobileDevice) {
                Alert.alert('Error', 'Failed to share location. Please try again.');
            } else {
                setLocationShareStatus({
                    type: 'error',
                    message: 'Failed to share location. Please try again.'
                });
                setTimeout(() => setLocationShareStatus(null), 3000);
            }
        } finally {
            setIsSharing(false);
        }
    };

    useEffect(() => {
        initializeLocation();
    }, []);

    // Status banner component for web notifications
    const StatusBanner = () => {
        if (!locationShareStatus) return null;
        
        const statusColors = {
            success: { bg: '#dcfce7', text: '#166534' },
            error: { bg: '#fee2e2', text: '#b91c1c' },
            warning: { bg: '#fef9c3', text: '#854d0e' },
        };
        
        const { bg, text } = statusColors[locationShareStatus.type];
        
        return (
            <View style={[styles.statusBanner, { backgroundColor: bg }]}>
                <Text style={[styles.statusBannerText, { color: text }]}>
                    {locationShareStatus.message}
                </Text>
            </View>
        );
    };

    const LocationInfo = () => (
        <View style={styles.locationInfo}>
            <View style={styles.locationIconContainer}>
                <Text style={styles.locationIcon}>📍</Text>
            </View>
            <View style={styles.locationTextContainer}>
                {location ? (
                    <Text style={styles.locationText}>
                        Your location detected ({location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)})
                    </Text>
                ) : (
                    <Text style={styles.locationText}>Detecting your location...</Text>
                )}
            </View>
        </View>
    );

    const AmbulanceCard = ({ ambulance }) => (
        <TouchableOpacity
            style={[
                styles.card,
                selectedAmbulance?.id === ambulance.id && styles.selectedCard
            ]}
            onPress={() => setSelectedAmbulance(ambulance)}
        >
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.vehicleReg}>{ambulance.vehicleReg}</Text>
                        <Text style={styles.hospitalName}>{ambulance.hospital}</Text>
                    </View>
                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: ambulance.status === 'Available' ? '#dcfce7' : '#fef9c3' }
                    ]}>
                        <Text style={[
                            styles.statusText,
                            { color: ambulance.status === 'Available' ? '#166534' : '#854d0e' }
                        ]}>
                            {ambulance.status}
                        </Text>
                    </View>
                </View>
                
                <View style={styles.cardDetails}>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Type:</Text>
                        <Text style={styles.detailValue}>{ambulance.type}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Distance:</Text>
                        <Text style={styles.detailValue}>{ambulance.distance} km</Text>
                    </View>
                </View>
                
                <View style={styles.cardActions}>
                    <TouchableOpacity
                        style={[
                            styles.callButton,
                            !isMobileDevice && styles.disabledButton
                        ]}
                        onPress={() => handleCall(ambulance.phone)}
                        disabled={!isMobileDevice}
                    >
                        <Text style={[
                            styles.buttonText,
                            !isMobileDevice && styles.disabledButtonText
                        ]}>
                            Call {!isMobileDevice && "(Mobile only)"}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.shareButton,
                            isSharing && styles.sharingButton
                        ]}
                        onPress={() => sendLocation(ambulance)}
                        disabled={isSharing}
                    >
                        <Text style={styles.buttonText}>
                            {isSharing ? 'Sending...' : 'Share Location'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            
            <LinearGradient 
                colors={['#002244', '#0056A3']} 
                style={tw`px-6 pt-14 pb-8 rounded-b-3xl shadow-lg mb-6`}
            >
                <View style={tw`flex-row justify-between items-center`}>
                    <View style={tw`flex-row justify-between items-center`}> 
                        <Text style={tw`text-3xl text-white font-bold`}>Emergency Assistance</Text>
                    </View>
                    <TouchableOpacity 
                        style={tw`p-2 rounded-full`}
                        onPress={() => router.push('/(tabs)/')}
                    >
                        <Ionicons name="home" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Status banner for web notifications */}
            <StatusBanner />

            {errorMsg && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
                </View>
            )}

            <LocationInfo />

            <View style={styles.listContainer}>
                <Text style={styles.listTitle}>Nearby Ambulances</Text>
                {isLoading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#2563eb" />
                        <Text style={styles.loaderText}>Searching for nearby ambulances...</Text>
                    </View>
                ) : nearbyAmbulances.length > 0 ? (
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {nearbyAmbulances.map((ambulance) => (
                            <AmbulanceCard key={ambulance.id} ambulance={ambulance} />
                        ))}
                    </ScrollView>
                ) : (
                    <View style={styles.noAmbulancesContainer}>
                        <Text style={styles.noAmbulancesText}>
                            No ambulances found nearby. Please try again or call emergency services directly.
                        </Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}


const styles = StyleSheet.create({
    // Container and layout styles
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    listContainer: {
        flex: 1,
        padding: 16,
    },

    // Header styles
    header: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#6b7280',
    },

    // Emergency instructions styles
    emergencyInstructions: {
        margin: 16,
        padding: 16,
        backgroundColor: '#fee2e2',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fca5a5',
    },
    instructionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#991b1b',
        marginBottom: 8,
    },
    instructionText: {
        fontSize: 14,
        color: '#7f1d1d',
        lineHeight: 20,
    },

    // Location info styles
    locationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#eff6ff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#dbeafe',
    },
    locationIconContainer: {
        marginRight: 8,
    },
    locationIcon: {
        fontSize: 20,
    },
    locationTextContainer: {
        flex: 1,
    },
    locationText: {
        fontSize: 14,
        color: '#1e40af',
    },

    // Error message styles
    errorContainer: {
        margin: 16,
        padding: 12,
        backgroundColor: '#fef2f2',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    errorText: {
        color: '#991b1b',
        fontSize: 14,
    },

    // Loading styles
    loaderContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    loaderText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
    },

    // List section styles
    listTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
    },
    noAmbulancesContainer: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noAmbulancesText: {
        textAlign: 'center',
        color: '#6b7280',
        fontSize: 16,
        lineHeight: 24,
    },

    // Ambulance card styles
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    selectedCard: {
        borderWidth: 2,
        borderColor: '#2563eb',
    },
    cardContent: {
        gap: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    vehicleReg: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    hospitalName: {
        fontSize: 16,
        color: '#4b5563',
        marginTop: 2,
    },
    
    // Card details styles
    cardDetails: {
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        padding: 12,
    },
    detailItem: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    detailLabel: {
        width: 80,
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    detailValue: {
        flex: 1,
        fontSize: 14,
        color: '#1f2937',
    },

    // Status badge styles
    statusBadge: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },

    // Card action buttons styles
    cardActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    callButton: {
        flex: 1,
        backgroundColor: '#2563eb',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    shareButton: {
        flex: 1,
        backgroundColor: '#059669',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    stopButton: {
        backgroundColor: '#dc2626',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    disabledButton: {
        backgroundColor: '#cbd5e1', // light gray
        opacity: 0.7,
    },
    disabledButtonText: {
        color: '#64748b', // gray text
    },
    sharingButton: {
        backgroundColor: '#9ca3af', // gray while sending
        opacity: 0.8,
    },
    statusBanner: {
        position: 'absolute',
        top: 140,
        left: 20,
        right: 20,
        padding: 12,
        borderRadius: 8,
        zIndex: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    statusBannerText: {
        fontWeight: '500',
        fontSize: 16,
        textAlign: 'center',
    },
});