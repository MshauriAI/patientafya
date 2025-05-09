import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Platform,
  Dimensions,
  Linking,
  StatusBar,
  StyleSheet
} from 'react-native';
import tw from "tailwind-react-native-classnames";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { jwtDecode } from "jwt-decode"; // Correct import
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import Modal from 'react-native-modal';
import Constants from 'expo-constants';

// Google Maps imports for web
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';

const { width } = Dimensions.get('window');

// Define map container style outside of component to prevent unnecessary re-renders
const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Map options for better performance and UX
const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

export default function NearbyHospitals() {
    const navigation = useNavigation();
    const [location, setLocation] = useState(null);
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [showOnlyEmergency, setShowOnlyEmergency] = useState(false);
    const [showInsuranceCovered, setShowInsuranceCovered] = useState(false);
    const [mapError, setMapError] = useState(false);
    const [mapView, setMapView] = useState(true); // Toggle between map and list view
    const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY;
    const URL = Constants.expoConfig?.extra?.API_URL;
    const mapRef = useRef(null);
    const router = useRouter();
    
    // Replaced useJsApiLoader with useLoadScript for better error handling
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries: ['places'],
    });

    useEffect(() => {
        const checkToken = async () => {
          try {
            const token = await AsyncStorage.getItem("token");
            if (token) {
              try {
                // Using the correct method for jwt-decode
                const decoded = jwtDecode(token);
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

    const fetchLocationAndHospitals = async () => {
      try {
          setLoading(true);
          console.log("Requesting location permissions...");
          
          // Different approach for web vs native
          if (Platform.OS === 'web') {
            const positionOptions = {
                enableHighAccuracy: true,  // Request highest accuracy (may be slower)
                timeout: 30000,           // Longer timeout to get more accurate fix
                maximumAge: 0             // Always get fresh location data
            };
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy // Keep track of accuracy
                    };
                    console.log("Web location obtained with accuracy:", coords.accuracy, "meters");
                    setLocation(coords);
                    fetchNearbyHospitals(coords.latitude, coords.longitude);
                },
                (error) => {
                    console.error("Error getting web location:", error.code, error.message);
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            alert("Location access was denied. Please enable location services in your browser settings to find nearby hospitals.");
                            break;
                        case error.POSITION_UNAVAILABLE:
                            alert("Location information is unavailable. Try again or enter your location manually.");
                            break;
                        case error.TIMEOUT:
                            alert("Location request timed out. Please try again or check your connection.");
                            break;
                        default:
                            alert("Unable to access your location. Please enable location services in your browser.");
                    }
                    setLoading(false);
                },
                positionOptions
            );
          } else {
              // iOS and Android specific handling with Expo Location
              let { status } = await Location.requestForegroundPermissionsAsync();
              if (status !== "granted") {
                  console.error("Location permission denied");
                  alert("Permission to access location was denied. Please enable location services to find nearby hospitals.");
                  setLoading(false);
                  return;
              }
      
              console.log("Getting current position...");
              // Use high accuracy on iOS to ensure better results
              const locationOptions = {
                accuracy: Platform.OS === 'ios' ? Location.Accuracy.BestForNavigation : Location.Accuracy.Balanced,
                timeInterval: 5000, // Refresh every 5 seconds on iOS
                distanceInterval: 10 // Minimum distance (meters) between location updates
              };
              
              let userLocation = await Location.getCurrentPositionAsync(locationOptions);
              
              console.log("Location obtained:", userLocation.coords);
              setLocation(userLocation.coords);
              
              // Ensure we have valid coordinates before fetching hospitals
              if (userLocation.coords && userLocation.coords.latitude && userLocation.coords.longitude) {
                  await fetchNearbyHospitals(userLocation.coords.latitude, userLocation.coords.longitude);
              } else {
                  console.error("Invalid coordinates received from location service");
                  alert("Unable to determine your precise location. Please try again.");
                  setLoading(false);
              }
          }
      } catch (error) {
          console.error("Error getting location:", error);
          setLoading(false);
          alert("Failed to get your location. Please make sure location services are enabled.");
      }
    };

    const fetchNearbyHospitals = async (lat, lng) => {
      try {
          console.log(`Fetching hospitals near ${lat},${lng}`);
          
          // For web platform, we need to use a proxy server or backend API
          // to avoid CORS issues with direct calls to Google Places API
          const radius = 10000; // 10km for better results
          
          let data;
          
          if (Platform.OS === 'web') {
            // In a real app, you would make this request to your backend server
            // which would then call the Google Places API
            // For demonstration, we'll use mock data for web
            console.log("Using mock hospital data for web demo at location: ", lat, " ", lng);
            console.log(`${URL}'/api/v1.0/places?location=${lat},${lng}&radius=3000&type=hospital`);
            try {
                const response = await fetch(`${URL}/api/v1.0/places?location=${lat},${lng}&radius=3000&type=hospital`);
                data = await response.json();
        
                if (data) {
                    console.log("Hospitals:", data);
                } else {
                    console.log("No hospitals found.");
                }
            } catch (error) {
                console.error("Error fetching hospitals:", error);
            }
          } else {
              // For native platforms, make the API request directly
              const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=hospital&key=${GOOGLE_MAPS_API_KEY}`;
              console.log("Places API URL:", url);
              
              let response = await fetch(
                url,
                {
                  method: "GET",
                  headers: {
                      "Content-Type": "application/json",
                      "Accept": "application/json"
                  }
                }
              );
              
              if (!response.ok) {
                  throw new Error(`HTTP error! Status: ${response.status}`);
              }
              
              data = await response.json();
          }
          
          console.log("Places API response status:", data.status);
          console.log("Number of results:", data.results ? data.results.length : 0);
          
          if (data.status === 'OK' && data.results && data.results.length > 0) {
              // Enhanced hospital data with more realistic attributes
              const enhancedHospitals = data.results.map((hospital, index) => ({
                  ...hospital,
                  id: hospital.place_id || `hospital-${index}`,
                  isEmergency: Math.random() > 0.4, // More realistic distribution
                  acceptsInsurance: Math.random() > 0.3,
                  waitTime: Math.floor(Math.random() * 120), // Random wait time in minutes
                  distanceAway: ((Math.random() * 2) + 0.5).toFixed(1), // Distance in km
              }));
  
              console.log("Enhanced hospitals data prepared:", enhancedHospitals.length);
              setHospitals(enhancedHospitals);
          } else {
              console.warn("No hospitals found or API error:", data.status);
              if (data.error_message) {
                  console.error("API error message:", data.error_message);
                  alert(`Error fetching hospitals: ${data.error_message}`);
              } else if (data.status === "ZERO_RESULTS") {
                  alert("No hospitals found nearby. Try increasing the search radius or changing location.");
              } else {
                  alert("Failed to find hospitals. Please check your internet connection and try again.");
              }
              setHospitals([]);
          }
      } catch (error) {
          console.error("Error fetching hospitals:", error);
          alert(`Error fetching hospitals: ${error.message}`);
          setHospitals([]);
      } finally {
          setLoading(false);
      }
    };

    const openGoogleMaps = (lat, lng) => {
        // iOS uses different format for maps URL
        const scheme = Platform.OS === 'ios' ? 'maps:' : 'geo:';
        const url = Platform.OS === 'ios' 
          ? `maps://app?daddr=${lat},${lng}&dirflg=d` 
          : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
          
        Linking.canOpenURL(url).then(supported => {
          if (supported) {
            Linking.openURL(url);
          } else {
            // Fallback for both platforms
            const browserUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
            Linking.openURL(browserUrl).catch(err => {
              console.error("Error opening maps:", err);
              alert("Unable to open maps. Please try again.");
            });
          }
        });
    };

    const callHospital = (phoneNumber) => {
        if (phoneNumber) {
            // iOS uses different format for phone URLs
            const formattedNumber = phoneNumber.replace(/\D/g, ''); // Strip non-digits
            const phoneUrl = `tel:${formattedNumber}`;
            
            Linking.canOpenURL(phoneUrl).then(supported => {
              if (supported) {
                Linking.openURL(phoneUrl);
              } else {
                alert("Phone calls not supported on this device");
              }
            }).catch(err => {
              console.error("Error making call:", err);
              alert("Unable to make call. Please try manually.");
            });
        } else {
            alert("Phone number not available");
        }
    };

    const filteredHospitals = hospitals.filter(hospital => 
        (!showOnlyEmergency || hospital.isEmergency) &&
        (!showInsuranceCovered || hospital.acceptsInsurance)
    );

    const handleMapError = () => {
        setMapError(true);
        console.error("Map failed to load");
        // Automatically switch to list view when map errors
        setMapView(false);
    };

    const handleWebViewMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'marker_click') {
                const hospital = hospitals.find(h => h.id === data.id);
                if (hospital) {
                    setSelectedHospital(hospital);
                }
            } else if (data.type === 'map_error') {
                console.error("WebView map error:", data.error);
                handleMapError();
            }
        } catch (e) {
            console.error('Error parsing WebView message:', e);
        }
    };

    // Web-specific Google Map component - improved implementation
    const renderWebMap = () => {
        if (!isLoaded) {
            return (
                <View style={{
                    height: '100%',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#f0f0f0'
                }}>
                    <ActivityIndicator size="large" color="#3498db" />
                    <Text style={{marginTop: 10}}>Loading map...</Text>
                </View>
            );
        }

        if (loadError) {
            console.error("Error loading Google Maps:", loadError);
            return (
                <View style={styles.mapErrorContainer}>
                    <Text style={styles.mapErrorText}>
                        Error loading map: {loadError.message || "Failed to load Google Maps"}
                    </Text>
                    <TouchableOpacity
                        style={styles.viewListButton}
                        onPress={() => setMapView(false)}>
                        <Text style={styles.viewListButtonText}>View List Instead</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        
        if (!location) {
            return (
                <View style={{
                    height: '100%',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#f0f0f0'
                }}>
                    <Text style={{marginTop: 10}}>Waiting for location...</Text>
                </View>
            );
        }
      
        return (
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={{
                    lat: location.latitude,
                    lng: location.longitude
                }}
                zoom={14}
                options={mapOptions}
                onLoad={map => {
                    console.log("Map loaded successfully");
                    mapRef.current = map;
                }}
            >
                {/* User location marker */}
                <Marker
                    position={{
                        lat: location.latitude,
                        lng: location.longitude
                    }}
                    icon={{
                        path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                        fillColor: "#4285F4",
                        fillOpacity: 1,
                        strokeColor: "#FFFFFF",
                        strokeWeight: 2,
                        scale: 2,
                        anchor: { x: 12, y: 22 },
                    }}
                />
      
                {/* Hospital markers */}
                {filteredHospitals.map((hospital) => (
                    <Marker
                        key={hospital.id}
                        position={{
                            lat: hospital.geometry.location.lat,
                            lng: hospital.geometry.location.lng
                        }}
                        icon={{
                            path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                            fillColor: hospital.isEmergency ? '#e74c3c' : '#3498db',
                            fillOpacity: 1,
                            strokeColor: "#FFFFFF",
                            strokeWeight: 2,
                            scale: 1.8,
                            anchor: { x: 12, y: 22 },
                        }}
                        onClick={() => {
                            console.log("Hospital marker clicked:", hospital.name);
                            setSelectedHospital(hospital);
                        }}
                    />
                ))}
            </GoogleMap>
        );
    };
    
    // Mobile-specific WebView Map implementation (fixed for iOS)
    const renderMobileMap = () => {
        if (!location) return null;
        
        // iOS WebView fixes - ensuring proper dimensions and interaction
        const webViewStyle = Platform.OS === 'ios' 
          ? { ...styles.map, height: Dimensions.get('window').height * 0.6 } 
          : styles.map;
          
        return (
            <WebView
                style={webViewStyle}
                originWhitelist={['*']}
                source={{
                    html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                        <style>
                            body, html, #map { 
                                height: 100%; 
                                margin: 0; 
                                padding: 0; 
                                position: absolute;
                                top: 0;
                                left: 0;
                                right: 0;
                                bottom: 0;
                                overflow: hidden;
                            }
                        </style>
                        <script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}"></script>
                        <script>
                            let map;
                            let markers = [];
                            
                            function initMap() {
                                try {
                                    map = new google.maps.Map(document.getElementById('map'), {
                                        center: {lat: ${location.latitude}, lng: ${location.longitude}},
                                        zoom: 14,
                                        zoomControl: true,
                                        mapTypeControl: false,
                                        scaleControl: false,
                                        streetViewControl: false,
                                        rotateControl: false,
                                        fullscreenControl: false
                                    });
                                    
                                    // Add user marker
                                    const userMarker = new google.maps.Marker({
                                        position: {lat: ${location.latitude}, lng: ${location.longitude}},
                                        map: map,
                                        title: "Your location",
                                        icon: {
                                            path: google.maps.SymbolPath.CIRCLE,
                                            scale: 10,
                                            fillColor: "#4285F4",
                                            fillOpacity: 1,
                                            strokeColor: "#FFFFFF",
                                            strokeWeight: 2,
                                        }
                                    });
                                    
                                    // Add hospital markers
                                    ${filteredHospitals.map((hospital, index) => `
                                        const hospital${index} = new google.maps.Marker({
                                            position: {
                                                lat: ${hospital.geometry.location.lat}, 
                                                lng: ${hospital.geometry.location.lng}
                                            },
                                            map: map,
                                            title: "${hospital.name.replace(/"/g, '\\"')}",
                                            icon: {
                                                path: google.maps.SymbolPath.CIRCLE,
                                                scale: 8,
                                                fillColor: "${hospital.isEmergency ? '#e74c3c' : '#3498db'}",
                                                fillOpacity: 1,
                                                strokeColor: "white",
                                                strokeWeight: 2,
                                            }
                                        });
                                        
                                        markers.push(hospital${index});
                                        
                                        hospital${index}.addListener('click', function() {
                                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                                type: 'marker_click',
                                                id: "${hospital.id}"
                                            }));
                                        });
                                    `).join('')}
                                    
                                    // iOS-specific fix: force map redraw after a short delay
                                    setTimeout(function() {
                                        google.maps.event.trigger(map, 'resize');
                                        map.setCenter({lat: ${location.latitude}, lng: ${location.longitude}});
                                    }, 300);
                                    
                                } catch (e) {
                                    console.error("Map initialization error:", e);
                                    window.ReactNativeWebView.postMessage(JSON.stringify({
                                        type: 'map_error',
                                        error: e.toString()
                                    }));
                                }
                            }
                            
                            // Wait for DOM to be fully loaded before initializing map
                            if (document.readyState === 'loading') {
                                document.addEventListener('DOMContentLoaded', initMap);
                            } else {
                                initMap();
                            }
                        </script>
                    </head>
                    <body>
                        <div id="map"></div>
                    </body>
                    </html>
                    `
                }}
                onMessage={handleWebViewMessage}
                onError={handleMapError}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: '#f0f0f0'
                    }}>
                        <ActivityIndicator size="large" color="#3498db" />
                        <Text style={{marginTop: 10}}>Loading map...</Text>
                    </View>
                )}
                // iOS-specific props
                scrollEnabled={false}
                bounces={false}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                automaticallyAdjustContentInsets={false}
            />
        );
    };

    useEffect(() => {
        fetchLocationAndHospitals();
    }, []);

    // Platform-specific map rendering function that selects the appropriate map implementation
    const renderMap = () => {
        // For web platform, use the React Google Maps API
        if (Platform.OS === 'web') {
            return renderWebMap();
        }
        // For mobile platforms (iOS, Android), use the WebView implementation
        else {
            return renderMobileMap();
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3498db" />
                    <Text style={styles.loadingText}>Finding nearby health facilities...</Text>
                    <Text style={styles.loadingSubtext}>We're locating the healthcare options closest to you</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" />
            
            <LinearGradient 
            colors={['#002244', '#0056A3']} 
            style={tw`px-6 pt-14 pb-8 rounded-b-3xl shadow-lg mb-6`}
            >
            <View style={tw`flex-row justify-between items-center`}>
                
                <View style={tw`flex-row justify-between items-center`}> 
                    <Text style={tw`text-3xl text-white font-bold`}>Nearby Facilities</Text>
                </View>
                <TouchableOpacity 
                    style={tw`p-2 rounded-full`}
                    onPress={() => router.push('/(tabs)/')}
                    >
                    <Ionicons name="home" size={24} color="white" />
                </TouchableOpacity>
            </View>
            </LinearGradient>

            {/* Wellness Message */}
            <View style={styles.wellnessMessage}>
                <Ionicons name="heart" size={20} color="#e74c3c" style={styles.wellnessIcon} />
                <Text style={styles.wellnessText}>
                    Finding care near you. Your health is our priority.
                </Text>
            </View>
            
            {/* Filters */}
            <View style={styles.filtersContainer}>
                <Text style={styles.filterLabel}>Filter By:</Text>
                <View style={styles.filterButtons}>
                    <TouchableOpacity
                        onPress={() => setShowOnlyEmergency(!showOnlyEmergency)}
                        style={[styles.filterButton, showOnlyEmergency && styles.emergencyActive]}
                    >
                        <Ionicons 
                            name="medkit" 
                            size={16} 
                            color={showOnlyEmergency ? 'white' : '#7f8c8d'} 
                            style={styles.filterIcon}
                        />
                        <Text style={[styles.filterText, showOnlyEmergency && styles.filterTextActive]}>
                            Emergency Care
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setShowInsuranceCovered(!showInsuranceCovered)}
                        style={[styles.filterButton, showInsuranceCovered && styles.insuranceActive]}
                    >
                        <Ionicons 
                            name="card" 
                            size={16} 
                            color={showInsuranceCovered ? 'white' : '#7f8c8d'} 
                            style={styles.filterIcon}
                        />
                        <Text style={[styles.filterText, showInsuranceCovered && styles.filterTextActive]}>
                            Insurance Accepted
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Results Count */}
            <View style={styles.resultsContainer}>
              <View style={styles.resultsCountContainer}>
                  <Ionicons name="location" size={16} color="#3498db" />
                  <Text style={styles.resultsCount}>
                      Found {filteredHospitals.length} health facilities near you
                  </Text>
              </View>
              <TouchableOpacity 
                    style={styles.viewToggle}
                    onPress={() => setMapView(!mapView)}
                >
                    <Ionicons 
                        name={mapView ? "list" : "map"} 
                        size={24} 
                        color="#3498db" 
                    />
                </TouchableOpacity>
            </View>

            {/* Here is where we use the renderMap function */}
            {mapView && location ? (
                <View style={styles.mapContainer}>
                    {mapError ? (
                        <View style={styles.mapErrorContainer}>
                            <Ionicons name="map-outline" size={48} color="#cbd5e1" />
                            <Text style={styles.mapErrorText}>Unable to load map</Text>
                            <TouchableOpacity
                                style={styles.viewListButton}
                                onPress={() => setMapView(false)}
                            >
                                <Text style={styles.viewListButtonText}>View List Instead</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        renderMap()
                    )}
                </View>
            ) : (
                <ScrollView style={styles.listContainer}>
                    {filteredHospitals.length > 0 ? (
                        filteredHospitals.map(hospital => (
                            <TouchableOpacity 
                                key={hospital.id} 
                                style={styles.hospitalCard}
                                onPress={() => setSelectedHospital(hospital)}
                            >
                                <View style={styles.hospitalCardContent}>
                                    <View style={styles.hospitalHeader}>
                                        <Text style={styles.hospitalName} numberOfLines={1}>{hospital.name}</Text>
                                        <View style={styles.ratingContainer}>
                                            <Ionicons name="star" size={16} color="#f1c40f" />
                                            <Text style={styles.ratingText}>
                                                {hospital.rating || "N/A"}
                                            </Text>
                                        </View>
                                    </View>
                                    
                                    <Text style={styles.hospitalAddress} numberOfLines={2}>{hospital.vicinity}</Text>
                                    
                                    <View style={styles.hospitalStats}>
                                        <View style={styles.statItem}>
                                            <Ionicons name="time-outline" size={16} color="#7f8c8d" />
                                            <Text style={styles.statText}>~{hospital.waitTime} min wait</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <Ionicons name="location-outline" size={16} color="#7f8c8d" />
                                            <Text style={styles.statText}>{hospital.distanceAway} km away</Text>
                                        </View>
                                    </View>
                                    
                                    <View style={styles.hospitalFeatures}>
                                        {hospital.isEmergency && (
                                            <View style={styles.featureBadge}>
                                                <Ionicons name="alert-circle" size={14} color="#e74c3c" />
                                                <Text style={styles.emergencyText}>Emergency Care</Text>
                                            </View>
                                        )}
                                        
                                        {hospital.acceptsInsurance && (
                                            <View style={styles.featureBadge}>
                                                <Ionicons name="shield-checkmark" size={14} color="#2ecc71" />
                                                <Text style={styles.insuranceText}>Insurance Accepted</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                                
                                <View style={styles.hospitalActions}>
                                    <TouchableOpacity 
                                        style={styles.actionButton}
                                        onPress={() => openGoogleMaps(
                                            hospital.geometry.location.lat, 
                                            hospital.geometry.location.lng
                                        )}
                                    >
                                        <Ionicons name="navigate" size={20} color="#3498db" />
                                        <Text style={styles.actionText}>Directions</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity 
                                        style={styles.actionButton}
                                        onPress={() => callHospital(hospital.formatted_phone_number || hospital.international_phone_number)}
                                    >
                                        <Ionicons name="call" size={20} color="#3498db" />
                                        <Text style={styles.actionText}>Call</Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.noResultsContainer}>
                            <Ionicons name="medical" size={48} color="#cbd5e1" />
                            <Text style={styles.noResultsText}>No hospitals match your filters</Text>
                            <TouchableOpacity
                                style={styles.resetFiltersButton}
                                onPress={() => {
                                    setShowOnlyEmergency(false);
                                    setShowInsuranceCovered(false);
                                }}
                            >
                                <Text style={styles.resetFiltersText}>Reset Filters</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Hospital Details Modal */}
            <Modal
                isVisible={selectedHospital !== null}
                onBackdropPress={() => setSelectedHospital(null)}
                onSwipeComplete={() => setSelectedHospital(null)}
                swipeDirection={['down']}
                propagateSwipe={true}
                style={styles.modal}
                animationIn="slideInUp"
                animationOut="slideOutDown"
                backdropTransitionOutTiming={0}
                avoidKeyboard={true}
            >
                {selectedHospital && (
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        
                        <ScrollView 
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.modalScrollContent}
                        >
                            <Text style={styles.modalTitle}>{selectedHospital.name}</Text>
                            
                            {selectedHospital.isEmergency && (
                                <View style={styles.emergencyBanner}>
                                    <Ionicons name="medical" size={20} color="white" />
                                    <Text style={styles.emergencyBannerText}>
                                        Emergency Services Available
                                    </Text>
                                </View>
                            )}
                            
                            <View style={styles.hospitalInfoRow}>
                                <Ionicons name="location" size={18} color="#7f8c8d" />
                                <Text style={styles.hospitalInfoText}>{selectedHospital.vicinity}</Text>
                            </View>
                            
                            <View style={styles.hospitalInfoRow}>
                                <Ionicons name="time" size={18} color="#7f8c8d" />
                                <Text style={styles.hospitalInfoText}>
                                    Current wait time: <Text style={{fontWeight: 'bold'}}>{selectedHospital.waitTime} minutes</Text>
                                </Text>
                            </View>
                            
                            {selectedHospital.rating && (
                                <View style={styles.hospitalInfoRow}>
                                    <Ionicons name="star" size={18} color="#f1c40f" />
                                    <Text style={styles.hospitalInfoText}>
                                        Rating: {selectedHospital.rating} ({selectedHospital.user_ratings_total || 0} reviews)
                                    </Text>
                                </View>
                            )}
                            
                            <View style={styles.hospitalInfoRow}>
                                <Ionicons name="pin" size={18} color="#7f8c8d" />
                                <Text style={styles.hospitalInfoText}>
                                    {selectedHospital.distanceAway} km from your location
                                </Text>
                            </View>

                            {selectedHospital.acceptsInsurance && (
                                <View style={styles.hospitalInfoRow}>
                                    <Ionicons name="card" size={18} color="#2ecc71" />
                                    <Text style={styles.hospitalInfoText}>
                                        Insurance accepted at this facility
                                    </Text>
                                </View>
                            )}

                            {/* Insurance Section */}
                            <View style={styles.sectionContainer}>
                                <Text style={styles.sectionTitle}>Insurance & Payment</Text>
                                <View style={styles.insuranceOptions}>
                                    {selectedHospital.acceptsInsurance ? (
                                        <>
                                            <Text style={styles.insuranceText}>
                                                This facility accepts most major insurance plans. Contact your provider to confirm coverage.
                                            </Text>
                                            <View style={styles.insuranceChips}>
                                                <View style={styles.insuranceChip}>
                                                    <Text style={styles.insuranceChipText}>Medicare</Text>
                                                </View>
                                                <View style={styles.insuranceChip}>
                                                    <Text style={styles.insuranceChipText}>Blue Cross</Text>
                                                </View>
                                                <View style={styles.insuranceChip}>
                                                    <Text style={styles.insuranceChipText}>United</Text>
                                                </View>
                                                <View style={styles.insuranceChip}>
                                                    <Text style={styles.insuranceChipText}>+ More</Text>
                                                </View>
                                            </View>
                                        </>
                                    ) : (
                                        <Text style={styles.noInsuranceText}>
                                            Insurance information not available. Please call to confirm coverage.
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* Services Section */}
                            <View style={styles.sectionContainer}>
                                <Text style={styles.sectionTitle}>Services</Text>
                                <View style={styles.servicesList}>
                                    {selectedHospital.isEmergency && (
                                        <View style={styles.serviceItem}>
                                            <Ionicons name="alert-circle" size={20} color="#e74c3c" />
                                            <Text style={styles.serviceText}>24/7 Emergency Care</Text>
                                        </View>
                                    )}
                                    <View style={styles.serviceItem}>
                                        <Ionicons name="fitness" size={20} color="#3498db" />
                                        <Text style={styles.serviceText}>General Medicine</Text>
                                    </View>
                                    <View style={styles.serviceItem}>
                                        <Ionicons name="heart" size={20} color="#3498db" />
                                        <Text style={styles.serviceText}>Cardiology</Text>
                                    </View>
                                    <View style={styles.serviceItem}>
                                        <Ionicons name="body" size={20} color="#3498db" />
                                        <Text style={styles.serviceText}>Orthopedics</Text>
                                    </View>
                                    <View style={styles.serviceItem}>
                                        <Ionicons name="flask" size={20} color="#3498db" />
                                        <Text style={styles.serviceText}>Laboratory Services</Text>
                                    </View>
                                    <View style={styles.serviceItem}>
                                        <Ionicons name="scan" size={20} color="#3498db" />
                                        <Text style={styles.serviceText}>Diagnostic Imaging</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Action Buttons */}
                            <View style={styles.modalActions}>
                                <TouchableOpacity 
                                    style={styles.modalActionButton}
                                    onPress={() => {
                                        openGoogleMaps(
                                            selectedHospital.geometry.location.lat, 
                                            selectedHospital.geometry.location.lng
                                        );
                                    }}
                                >
                                    <LinearGradient 
                                        colors={['#3498db', '#2980b9']} 
                                        style={styles.modalActionGradient}
                                    >
                                        <Ionicons name="navigate" size={24} color="white" />
                                        <Text style={styles.modalActionText}>Get Directions</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={[styles.modalActionButton, styles.callButton]}
                                    onPress={() => {
                                        callHospital(
                                            selectedHospital.formatted_phone_number || 
                                            selectedHospital.international_phone_number
                                        );
                                    }}
                                >
                                    <LinearGradient 
                                        colors={['#2ecc71', '#27ae60']} 
                                        style={styles.modalActionGradient}
                                    >
                                        <Ionicons name="call" size={24} color="white" />
                                        <Text style={styles.modalActionText}>Call Facility</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>

                            {/* Check-in Button */}
                            <TouchableOpacity 
                                style={styles.checkinButton}
                                onPress={() => {
                                    setSelectedHospital(null);
                                    // Navigate to check-in screen
                                    router.push({
                                        pathname: '/check-in',
                                        params: { 
                                            hospitalId: selectedHospital.id,
                                            hospitalName: selectedHospital.name
                                        }
                                    });
                                }}
                            >
                                <LinearGradient
                                    colors={['#002244', '#0056A3']}
                                    style={styles.checkinGradient}
                                >
                                    <Ionicons name="clipboard" size={24} color="white" />
                                    <Text style={styles.checkinText}>Start Online Check-in</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </ScrollView>
                        
                        <TouchableOpacity 
                            style={styles.closeModalButton}
                            onPress={() => setSelectedHospital(null)}
                        >
                            <Ionicons name="close" size={24} color="#7f8c8d" />
                        </TouchableOpacity>
                    </View>
                )}
            </Modal>
        </SafeAreaView>
    );
}



const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 20,
        color: '#334155',
    },
    loadingSubtext: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 10,
        textAlign: 'center',
    },
    wellnessMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        marginHorizontal: 16,
        marginBottom: 16,
    },
    wellnessIcon: {
        marginRight: 10,
    },
    wellnessText: {
        fontSize: 14,
        color: '#334155',
        flex: 1,
    },
    filtersContainer: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
    },
    filterButtons: {
        flexDirection: 'row',
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
    },
    emergencyActive: {
        backgroundColor: '#e74c3c',
    },
    insuranceActive: {
        backgroundColor: '#3498db',
    },
    filterIcon: {
        marginRight: 6,
    },
    filterText: {
        fontSize: 13,
        color: '#64748b',
    },
    filterTextActive: {
        color: 'white',
    },
    resultsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    resultsCountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    resultsCount: {
        marginLeft: 6,
        fontSize: 14,
        color: '#475569',
    },
    viewToggle: {
        padding: 8,
    },
    mapContainer: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
        margin: 16,
        marginTop: 0,
    },
    map: {
        flex: 1,
    },
    mapErrorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    mapErrorText: {
        fontSize: 16,
        color: '#64748b',
        marginTop: 10,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    viewListButton: {
        backgroundColor: '#3498db',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 16,
    },
    viewListButtonText: {
        color: 'white',
        fontWeight: '500',
    },
    listContainer: {
        paddingHorizontal: 16,
    },
    hospitalCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        flexDirection: 'row',
    },
    hospitalCardContent: {
        flex: 1,
        padding: 16,
    },
    hospitalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    hospitalName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        flex: 1,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        backgroundColor: '#fffbeb',
        borderRadius: 4,
    },
    ratingText: {
        marginLeft: 4,
        fontSize: 13,
        fontWeight: '500',
        color: '#854d0e',
    },
    hospitalAddress: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 8,
    },
    hospitalStats: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    statText: {
        marginLeft: 4,
        fontSize: 13,
        color: '#64748b',
    },
    hospitalFeatures: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    featureBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginRight: 8,
    },
    emergencyText: {
        marginLeft: 4,
        fontSize: 12,
        color: '#e74c3c',
    },
    insuranceText: {
        marginLeft: 4,
        fontSize: 12,
        color: '#2ecc71',
    },
    quickActions: {
        justifyContent: 'center',
        paddingRight: 12,
    },
    actionButton: {
        padding: 8,
        marginBottom: 8,
    },
    noResultsContainer: {
        alignItems: 'center',
        padding: 40,
    },
    noResultsText: {
        fontSize: 16,
        color: '#64748b',
        marginTop: 12,
        textAlign: 'center',
    },
    resetButton: {
        backgroundColor: '#3498db',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 16,
    },
    resetButtonText: {
        color: 'white',
        fontWeight: '500',
    },
    modal: {
        margin: 0,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingTop: 16,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#e2e8f0',
        alignSelf: 'center',
        marginBottom: 16,
    },
    emergencyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef2f2',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 16,
    },
    emergencyIcon: {
        marginRight: 8,
    },
    emergencyBannerText: {
        color: '#dc2626',
        fontSize: 14,
        fontWeight: '500',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 4,
    },
    modalAddress: {
        fontSize: 15,
        color: '#64748b',
        marginBottom: 12,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalRating: {
        marginLeft: 6,
        fontSize: 14,
        color: '#64748b',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#f8fafc',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    statLabel: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 4,
        textAlign: 'center',
    },
    statValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#334155',
        textAlign: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#e2e8f0',
    },
    patientInfo: {
        backgroundColor: '#f0f9ff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    patientInfoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0369a1',
        marginBottom: 12,
    },
    patientInfoItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    patientInfoText: {
        marginLeft: 10,
        fontSize: 14,
        color: '#334155',
        flex: 1,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
    },
    modalButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 10,
    },
    primaryButton: {
        backgroundColor: '#3498db',
        marginRight: 8,
    },
    secondaryButton: {
        backgroundColor: '#10b981',
        marginLeft: 8,
    },
    primaryButtonText: {
        marginLeft: 8,
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
    secondaryButtonText: {
        marginLeft: 8,
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e3a8a',
  },
  viewToggle: {
    padding: 8,
  },
  
  // Wellness message
  wellnessMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#edf2f7',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  wellnessIcon: {
    marginRight: 10,
  },
  wellnessText: {
    fontSize: 14,
    color: '#334155',
    flex: 1,
  },
  
  // Filters
  filtersContainer: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emergencyActive: {
    backgroundColor: '#e74c3c',
    borderColor: '#c0392b',
  },
  insuranceActive: {
    backgroundColor: '#2ecc71',
    borderColor: '#27ae60',
  },
  filterIcon: {
    marginRight: 6,
  },
  filterText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  filterTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  resultsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  // Results count
  resultsCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  resultsCount: {
    marginLeft: 6,
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  
  // Map
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: 'white',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  userMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
    borderWidth: 2,
    borderColor: 'white',
  },
  hospitalMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  standardMarker: {
    backgroundColor: '#3498db',
  },
  emergencyMarker: {
    backgroundColor: '#e74c3c',
  },
  
  // List view
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  hospitalCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2.5,
    elevation: 2,
    overflow: 'hidden',
  },
  hospitalCardContent: {
    flex: 1,
    padding: 16,
  },
  hospitalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e3a8a',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  ratingText: {
    marginLeft: 4,
    fontWeight: '600',
    fontSize: 14,
    color: '#64748b',
  },
  hospitalAddress: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 10,
  },
  hospitalStats: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#64748b',
  },
  hospitalFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emergencyText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#e74c3c',
    marginLeft: 4,
  },
  insuranceText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2ecc71',
    marginLeft: 4,
  },
  quickActions: {
    justifyContent: 'space-around',
    padding: 8,
    backgroundColor: '#f8fafc',
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
  },
  actionButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // No results
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noResultsText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  resetButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  resetButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  
  // Help panel
  helpPanel: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  helpButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginRight: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  helpButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  emergencyCallButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginLeft: 8,
    backgroundColor: '#ef4444',
    borderRadius: 8,
  },
  emergencyCallText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  
  // Modal
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    marginTop: 10,
    marginBottom: 20,
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 10,
    marginBottom: 16,
  },
  emergencyIcon: {
    marginRight: 8,
  },
  emergencyBannerText: {
    color: '#b91c1c',
    fontWeight: '600',
    fontSize: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e3a8a',
    marginHorizontal: 20,
    marginBottom: 6,
  },
  modalAddress: {
    fontSize: 15,
    color: '#64748b',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  modalRating: {
    marginLeft: 6,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  
  // Stats row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'center',
  },
  
  // Patient info
  patientInfo: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  patientInfoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 12,
  },
  patientInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientInfoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#334155',
  },
  
  // Buttons
  buttonRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    gap: 12,
  },
  directionsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 14,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 14,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  }
});