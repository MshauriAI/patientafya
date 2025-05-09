import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, Image, Linking, Platform, RefreshControl, SafeAreaView, ScrollView, Share, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import tw from "tailwind-react-native-classnames";
import { getReportsTotal, getUpcomingAppointments, getUpcomingAppointmentsCount } from "../../services/appointmentService";
// Remove MaskedView import as it's causing PlatformConstants error
import * as jwt_decode from "jwt-decode"; // Fixed import statement

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === 'web';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState({ name: '' });
  const [token, setToken] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState(null);
  const [upcomingAppointmentsCount, setUpcomingAppointmentsCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);
  const [walletBallance, setWalletBalance] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
  const [refreshing, setRefreshing] = useState(false);

  // const [healthStats, setHealthStats] = useState({
  //   heartRate: "78",
  //   bloodPressure: "120/80",
  //   steps: "5,642",
  //   sleep: "7.5"
  // });
  
  const getGridColumns = () => {
    if (isWeb) {
      if (width > 1024) return 4; // large screens
      if (width > 768) return 3;  // medium screens
    }
    return 2; // default for mobile
  };
  const columns = getGridColumns();
  const columnWidth = `w-1/${columns}`;

  const quickActions = [
    { 
      title: 'Book a Doctor', 
      icon: 'medical',
      color: 'bg-red-100',
      iconColor: '#d97706',
      route: '/(tabs)/doctors' 
    },
    { 
      title: 'Find Hospitals', 
      icon: 'location',
      color: 'bg-green-100',
      iconColor: '#059669',
      route: '/maps' 
    },
    { 
      title: 'Medical Reports', 
      icon: 'document-text',
      color: 'bg-blue-100', 
      iconColor: '#2563eb',
      route: '/reports' 
    },
    { 
      title: 'Ambulances', 
      icon: 'car',
      color: 'bg-purple-100',
      iconColor: '#7c3aed',
      route: '/ambulances' 
    },
    // { 
    //   title: 'Wallet', 
    //   icon: 'wallet',
    //   color: 'bg-teal-100',
    //   iconColor: '#0d9488',
    //   route: '/wallet' 
    // },
    // {
    //   title: 'Invite Friends',
    //   icon: 'share',
    //   color: 'bg-yellow-100',
    //   iconColor: '#ca8a04',
    //   route: '',
    //   action: () => shareInvitationViaSMS() // Use the new function
    // }
  ];

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

  // Add a resize listener for web
  useEffect(() => {
    if (isWeb) {
      const handleResize = () => {
        setWindowWidth(Dimensions.get('window').width);
      };
      
      // Safe way to add resize listener across platforms
      const subscription = Dimensions.addEventListener('change', handleResize);
      
      return () => {
        // Safe way to clean up event listener
        subscription?.remove?.();
      };
    }
  }, []);

  // Fetch user data and appointments
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const [userInfo, storedToken] = await Promise.all([
        AsyncStorage.getItem('userInfo'),
        AsyncStorage.getItem("token")
      ]);

      if (userInfo && storedToken) {
        const parsedUser = JSON.parse(userInfo);
        setUser(parsedUser);
        setToken(storedToken);
        setImageUri(parsedUser.imageUri || null);

        const [appointmentsCount, appointments, totalReports] = await Promise.all([
          getUpcomingAppointmentsCount(),
          getUpcomingAppointments(),
          getReportsTotal()
        ]);

        setUpcomingAppointments(appointments);
        setUpcomingAppointmentsCount(appointmentsCount);
        setReportsCount(totalReports);
        fetchWalletData(storedToken, parsedUser['number']);
  
      }
    } catch (error) {
    } finally {
      setRefreshing(false);
    }
  };

  const fetchWalletData = async (token, phoneNumber) => {
    try {      
      // Fetch wallet balance
      const balanceResponse = await fetch(
        `https://api.afyamkononi.co.ke/api/v1.0/wallet/balance?phone_number=${phoneNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Update state with fetched data
      const balanceData = await balanceResponse.json()
      if (balanceResponse.ok) {
        // const balanceData = await balanceResponse.json();
        if (balanceData && balanceData.balance) {
          setWalletBalance(balanceData.balance);
        } else {
          setWalletBalance(0);
        }
      } else {
        setWalletBalance(0);
      }


    } catch (error) {
      console.error('Error fetching wallet data:', error);
      setWalletBalance(balanceData.balance);
    } finally {;
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserData();
  };

  // Get container style based on screen width for web
  const getContainerStyle = () => {
    if (isWeb) {
      if (windowWidth > 1200) {
        return { maxWidth: 1200, marginHorizontal: 'auto' };
      } else if (windowWidth > 992) {
        return { maxWidth: 992, marginHorizontal: 'auto' };
      } else if (windowWidth > 768) {
        return { maxWidth: 768, marginHorizontal: 'auto' };
      }
    }
    return {}; // Default style for mobile
  };

  // Web Nav Bar
  const WebNavBar = () => {
    if (!isWeb) return null;
    
    return (
      <View style={[
        tw`bg-white border-b border-gray-200 w-full shadow-sm sticky top-0`,
        { zIndex: 100 }
      ]}>
        <View style={[
          tw`flex-row justify-between items-center py-4 px-6 md:px-8`,
          getContainerStyle()
        ]}>
          {/* Logo/App Name */}
          <TouchableOpacity
            style={tw`flex-row items-center`}
            onPress={() => router.push('/')}
          >
            <Image
              source={require('../../assets/images/icon.jpg')}
              style={tw`w-10 h-10 rounded-lg mr-3`}
              resizeMode="cover"
            />
            
            {/* Simplified cross-platform solution for gradient text */}
            <View style={tw`relative`}>
              {Platform.OS === 'web' ? (
                <Text 
                  style={[
                    { fontFamily: 'Poppins, sans-serif', fontWeight: '600' },
                    tw`text-xl`,
                    { 
                      backgroundImage: 'linear-gradient(to right, #15803d, #0369a1)', 
                      WebkitBackgroundClip: 'text', 
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      color: '#15803d' // Fallback color
                    }
                  ]}
                >
                  AfyaMkononi
                </Text>
              ) : (
                <LinearGradient
                  colors={['#15803d', '#0369a1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={tw`px-2 py-1 rounded`}
                >
                  <Text 
                    style={[
                      { fontFamily: 'Poppins-SemiBold' }, 
                      tw`text-xl text-white`
                    ]}
                  >
                    AfyaMkononi
                  </Text>
                </LinearGradient>
              )}
            </View>
          </TouchableOpacity>

          {/* Navigation Links - Only show on larger screens */}
          {windowWidth >= 768 && (
            <View style={tw`flex-row items-center`}>
              {[
                { title: 'Home', icon: 'home', route: '/' },
                { title: 'Doctors', icon: 'people', route: '/(tabs)/doctors' },
                { title: 'Appointments', icon: 'calendar', route: '/appointments' },
                { title: 'Reports', icon: 'document-text', route: '/reports' },
              ].map((item, index) => (
                <TouchableOpacity 
                  key={index}
                  style={tw`mx-3 flex-row items-center py-2 px-3 hover:bg-gray-50 rounded-lg transition-all duration-200`}
                  onPress={() => router.push(item.route)}
                >
                  <Ionicons name={item.icon} size={18} color="#4b5563" style={tw`mr-2`} />
                  <Text style={[
                    tw`text-gray-700 text-base`, 
                    { fontFamily: 'Outfit, sans-serif', fontWeight: '500' }
                  ]}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {/* Profile Section */}
          <TouchableOpacity 
            style={tw`flex-row items-center bg-gray-50 hover:bg-gray-100 py-2 px-3 rounded-full transition-all duration-200`}
            onPress={() => router.push('/(tabs)/profile')}
          >
            {user.imageUri ? (
              <Image 
                source={{ uri: user.imageUri }} 
                style={tw`w-8 h-8 rounded-full mr-2`}
                resizeMode="cover"
              />
            ) : (
              <View style={tw`w-8 h-8 rounded-full bg-blue-600 items-center justify-center mr-2`}>
                <Ionicons name="person" size={16} color="white" />
              </View>
            )}
            <Text style={[
              tw`text-gray-800`, 
              { fontFamily: 'Outfit, sans-serif', fontWeight: '500' }
            ]}>
              {user.firstName || 'User'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#6b7280" style={tw`ml-2`} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Unified Header for both web and mobile
  const renderHeader = () => {
    // Common gradient colors
    const gradientColors = ['#002244', '#0056A3'];
    
    if (isWeb && windowWidth >= 768) {
      // Refined header for web desktop that maintains consistency with mobile version
      return (
        <LinearGradient 
          colors={gradientColors} 
          style={tw`px-6 py-8 rounded-b-2xl shadow-md mb-6`}
        >
          <View style={tw`flex-row justify-between items-center`}>
            <View>
              <Text style={[tw`text-base text-gray-300`, { fontFamily: 'Poppins, sans-serif' }]}>
                Welcome Back,
              </Text>
              <Text style={[tw`text-2xl text-white`, { fontFamily: 'Poppins, sans-serif', fontWeight: '600' }]}>
                {user.firstName || 'User'}
              </Text>
            </View>

            {/* Wallet info in header */}
            <TouchableOpacity 
              style={styles.headerWalletContainer}
              onPress={() => router.push('/wallet')}
              activeOpacity={0.8}
            >
              <View style={styles.headerWalletContent}>
                <Ionicons name="wallet-outline" size={24} color="#FFFFFF" style={styles.headerWalletIcon} />
                <View>
                  <Text style={styles.headerWalletLabel}>Your Balance</Text>
                  {loadingWallet ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.headerWalletAmount}>KSH {walletBallance.toLocaleString()}</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      );
    }
    
    // Refined mobile header
    return (
      <LinearGradient 
        colors={gradientColors} 
        style={[
          tw`px-6 pb-8 rounded-b-3xl shadow-lg mb-6`,
          isWeb ? { paddingTop: 40 } : { paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 40 }
        ]}
      >
        <View style={tw`flex-row justify-between items-center mb-4`}>
          <View>
            <Text style={[tw`text-base text-gray-300`, { fontFamily: isWeb ? 'Poppins, sans-serif' : 'Poppins-Regular' }]}>
              Welcome Back,
            </Text>
            <Text style={[tw`text-2xl text-white`, { fontFamily: isWeb ? 'Poppins, sans-serif' : 'Poppins-SemiBold', fontWeight: isWeb ? '600' : undefined }]}>
              {user.firstName ? `${user.firstName} ${user.lastName || ''}` : 'User'}
            </Text>
          </View>
          
          {/* Wallet info in mobile header */}
          <TouchableOpacity 
            style={styles.headerWalletContainer}
            onPress={() => router.push('/wallet')}
            activeOpacity={0.8}
          >
            <View style={styles.headerWalletContent}>
              <Ionicons name="wallet-outline" size={22} color="#FFFFFF" style={styles.headerWalletIcon} />
              <View>
                <Text style={styles.headerWalletLabel}>Balance</Text>
                <Text style={styles.headerWalletAmount}>
                  KSH {walletBallance.toLocaleString()}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  };

  // Wallet Card component
  // const WalletCard = () => {
  //   return (
  //     <TouchableOpacity 
  //       style={styles.walletCardContainer} 
  //       onPress={() => router.push('/wallet')}
  //       activeOpacity={0.9}
  //     >
  //       <LinearGradient
  //         colors={['rgba(16, 185, 129, 0.8)', 'rgba(5, 150, 105, 0.9)']}
  //         start={{ x: 0, y: 0 }}
  //         end={{ x: 1, y: 1 }}
  //         style={styles.walletCard}
  //       >
  //         <View style={styles.walletContent}>
  //           <View style={styles.walletTextContainer}>
  //             <Text style={styles.walletLabel}>Your Earnings</Text>
  //             {loadingWallet ? (
  //               <ActivityIndicator size="small" color="#FFFFFF" />
  //             ) : (
  //               <Text style={styles.walletAmount}>KSH {walletBallance.toLocaleString()}</Text>
  //             )}
  //           </View>
  //           <View style={styles.walletIconContainer}>
  //             <Ionicons name="wallet-outline" size={28} color="#FFFFFF" />
  //           </View>
  //         </View>
  //         <View style={styles.viewWalletContainer}>
  //           <Text style={styles.viewWalletText}>Manage Wallet</Text>
  //           <Ionicons name="chevron-forward" size={16} color="#FFFFFF" style={{opacity: 0.9}} />
  //         </View>
  //       </LinearGradient>
  //     </TouchableOpacity>
  //   );
  // };

  // Appointment card with meeting link
  const renderUpcomingAppointment = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showAlert, setShowAlert] = useState(false);
    
    // Update the current time every minute
    useEffect(() => {
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 60000);
      return () => clearInterval(timer);
    }, []);
    
    // First, ensure the isMeetingAvailable function is working correctly
    const isMeetingAvailable = (appointmentDate) => {
      if (!appointmentDate) return false;
      
      try {
        const datePart = upcomingAppointments[0]?.date;
        const timePart = upcomingAppointments[0]?.time;
        
        if (!datePart || !timePart) return false;
        
        // Create a new Date object for the appointment time
        let appointmentTime;
        
        if (datePart.includes('/')) {
          // DD/MM/YYYY format
          const [day, month, year] = datePart.split('/');
          const [hours, minutes] = timePart.split(':');
          appointmentTime = new Date(year, month - 1, day, hours, minutes);
        } else if (datePart.includes('-')) {
          // YYYY-MM-DD format
          const [hours, minutes] = timePart.split(':');
          appointmentTime = new Date(`${datePart}T${timePart}`);
        } else {
          return false;
        }
        
        // Get the current time
        const now = new Date();
        
        // Calculate time difference in minutes (positive means appointment is in the past)
        const diffInMinutes = Math.floor((now - appointmentTime) / (1000 * 60));
        
        console.log("Current time:", now);
        console.log("Appointment time:", appointmentTime);
        console.log("Minutes since appointment:", diffInMinutes);
        
        // Meeting is available from 10 minutes before to 30 minutes after
        return diffInMinutes >= -10 && diffInMinutes <= 30;
      } catch (error) {
        console.error("Error in isMeetingAvailable:", error);
        return false;
      }
    };
        
    // Function to format the appointment date
    const formatAppointmentDate = (dateString) => {
      if (!dateString) return "";
      
      try {
        // Handle different date formats
        let dateObj;
        if (dateString.includes('/')) {
          // If date is in DD/MM/YYYY format
          dateObj = new Date(dateString.split('/').reverse().join('-'));
        } else if (dateString.includes('-')) {
          // If date is in YYYY-MM-DD format
          dateObj = new Date(dateString);
        } else {
          return dateString;
        }
        
        // Format date as "Mon, 28 Feb"
        return dateObj.toLocaleDateString('en-US', { 
          weekday: 'short',
          day: 'numeric', 
          month: 'short'
        });
      } catch (error) {
        console.error("Error formatting date:", error);
        return dateString;
      }
    };
    
    // Function to generate time countdown text
    const getCountdownText = (appointmentDate) => {
      if (!appointmentDate) return "";
      
      try {
        // Get the date and time from the appointment data
        const datePart = upcomingAppointments[0]?.date;
        const timePart = upcomingAppointments[0]?.time;
        
        if (!datePart || !timePart) return "";
        
        // Parse the date correctly depending on format
        let appointmentDateTime;
        if (datePart.includes('/')) {
          // If date is in DD/MM/YYYY format, convert to YYYY-MM-DD
          const [day, month, year] = datePart.split('/');
          appointmentDateTime = `${year}-${month}-${day}T${timePart}`;
        } else if (datePart.includes('-')) {
          // If date is in YYYY-MM-DD format
          appointmentDateTime = `${datePart}T${timePart}`;
        } else {
          console.error("Unknown date format:", datePart);
          return "";
        }
        
        const appointmentTime = new Date(appointmentDateTime);
        
        // Check if appointmentTime is valid
        if (isNaN(appointmentTime.getTime())) {
          console.error("Invalid date created:", appointmentDateTime);
          return "";
        }
        
        const diffInMinutes = Math.floor((appointmentTime - currentTime) / (1000 * 60));
        
        if (diffInMinutes < 0) {
          return "In progress";
        } else if (diffInMinutes < 60) {
          return `In ${diffInMinutes} mins`;
        } else if (diffInMinutes < 24 * 60) {
          const hours = Math.floor(diffInMinutes / 60);
          const mins = diffInMinutes % 60;
          return `In ${hours}h ${mins > 0 ? `${mins}m` : ''}`;
        } else {
          const days = Math.floor(diffInMinutes / (24 * 60));
          const hours = Math.floor((diffInMinutes % (24 * 60)) / 60);
          return `In ${days}d ${hours > 0 ? `${hours}h` : ''}`;
        }
      } catch (error) {
        console.error("Error calculating countdown:", error);
        return "";
      }
    };
  
    // Function to handle the meeting link
    const handleMeetingLink = (link) => {
      // Only open the link if the meeting is available
      if (link && isMeetingAvailable(upcomingAppointments[0]?.date)) {
        console.log("Link: ", link);
        Linking.openURL(link);
      } else {
        // Show alert if meeting is not available
        showMeetingAlert();
      }
    };
  
    // Function to get time until meeting is available
    const getTimeUntilAvailable = () => {
      try {
        const datePart = upcomingAppointments[0]?.date;
        const timePart = upcomingAppointments[0]?.time;
        
        if (!datePart || !timePart) return "";
        
        // Parse the date correctly depending on format
        let appointmentDateTime;
        if (datePart.includes('/')) {
          // If date is in DD/MM/YYYY format, convert to YYYY-MM-DD
          const [day, month, year] = datePart.split('/');
          appointmentDateTime = `${year}-${month}-${day}T${timePart}`;
        } else if (datePart.includes('-')) {
          // If date is in YYYY-MM-DD format
          appointmentDateTime = `${datePart}T${timePart}`;
        } else {
          console.error("Unknown date format:", datePart);
          return "";
        }
        
        const appointmentTime = new Date(appointmentDateTime);
        
        // Check if appointmentTime is valid
        if (isNaN(appointmentTime.getTime())) {
          console.error("Invalid appointment date created:", appointmentDateTime);
          return "";
        }
        
        const availableTime = new Date(appointmentTime);
        availableTime.setMinutes(availableTime.getMinutes() - 10); // 10 minutes before
        
        const diffInMinutes = Math.floor((availableTime - currentTime) / (1000 * 60));
        
        if (diffInMinutes <= 0) {
          return "Now";
        } else if (diffInMinutes < 60) {
          return `in ${diffInMinutes} min${diffInMinutes !== 1 ? 's' : ''}`;
        } else if (diffInMinutes < 24 * 60) {
          const hours = Math.floor(diffInMinutes / 60);
          const mins = diffInMinutes % 60;
          return `in ${hours}h${mins ? ` ${mins}m` : ''}`;
        } else {
          const days = Math.floor(diffInMinutes / (24 * 60));
          const hours = Math.floor((diffInMinutes % (24 * 60)) / 60);
          return `in ${days}d${hours ? ` ${hours}h` : ''}`;
        }
      } catch (error) {
        console.error("Error calculating time until available:", error);
        return "";
      }
    };
  
    // Cross-platform alert function
    const showMeetingAlert = () => {
      if (Platform.OS === 'web') {
        setShowAlert(true);
        // Auto-hide after 3 seconds
        setTimeout(() => setShowAlert(false), 3000);
      } else {
        Alert.alert(
          "Meeting Not Yet Available", 
          "This meeting will be accessible 10 minutes before the scheduled start time."
        );
      }
    };
  
    // Get status color based on status
    const getStatusColors = (status) => {
      switch(status.toLowerCase()) {
        case 'confirmed':
          return { bg: 'bg-green-100', text: 'text-green-800' };
        case 'cancelled':
          return { bg: 'bg-red-100', text: 'text-red-800' };
        case 'completed':
          return { bg: 'bg-blue-100', text: 'text-blue-800' };
        case 'pending':
        default:
          return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
      }
    };
  
    const statusColors = getStatusColors(upcomingAppointmentsCount[0]?.status || 'pending');
    
    // Add this right before the return statement in the render function
    useEffect(() => {
      const checkInterval = setInterval(() => {
        const isAvailable = isMeetingAvailable(upcomingAppointmentsCount[0]?.date);
        console.log("Meeting availability check:", isAvailable);
        // Force re-render if needed
        if (!isAvailable) {
          setCurrentTime(new Date());
        }
      }, 10000); // Check every 10 seconds
      
      return () => clearInterval(checkInterval);
    }, []);
  
    // Detect mobile web specifically
    const isMobileWeb = Platform.OS === 'web' && window.innerWidth < 768;
  
    return (
      <View style={tw`bg-white rounded-2xl p-4 shadow-md mb-6 relative`}>
        {/* Web Alert */}
        {Platform.OS === 'web' && showAlert && (
          <View style={tw`absolute top-2 left-0 right-0 mx-auto w-4/5 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 shadow-md`}>
            <View style={tw`flex flex-row items-center justify-between`}>
              <View style={tw`flex flex-row items-center`}>
                <Ionicons name="information-circle" size={20} color="#ef4444" />
                <Text style={[
                  tw`ml-2 text-red-700`, 
                  { fontFamily: isWeb ? 'Outfit, sans-serif' : 'outfit-medium' }
                ]}>
                  Meeting Not Yet Available
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAlert(false)}>
                <Ionicons name="close" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
            <Text style={[
              tw`mt-1 text-red-700 text-sm`, 
              { fontFamily: isWeb ? 'Outfit, sans-serif' : 'outfit' }
            ]}>
              This meeting will be accessible 10 minutes before the scheduled start time.
            </Text>
          </View>
        )}
  
        <View style={tw`flex flex-row justify-between items-center mb-4`}>
          <Text style={[
            tw`text-lg text-gray-900`, 
            { fontFamily: isWeb ? 'Outfit, sans-serif' : 'outfit-bold', fontWeight: isWeb ? '700' : undefined }
          ]}>
            Upcoming Appointment {upcomingAppointmentsCount > 0 && `(${upcomingAppointmentsCount})`}
          </Text>
          <TouchableOpacity 
            onPress={() => router.push('/appointments')}
            style={tw`flex flex-row items-center`}
          >
            <Text style={[
              tw`text-blue-600 mr-1`, 
              { fontFamily: isWeb ? 'Outfit, sans-serif' : 'outfit-medium', fontWeight: isWeb ? '500' : undefined }
            ]}>
              View all
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#2563eb" />
          </TouchableOpacity>
        </View>
  
        {upcomingAppointments && upcomingAppointments.length > 0 ? (
          <View style={tw`bg-blue-50 rounded-xl p-4 ${isWeb ? 'shadow-sm' : ''}`}>
            {/* Countdown timer tag */}
            <View style={[
              tw`absolute -top-2 right-4 bg-blue-700 px-3 py-1 rounded-full z-10`,
              { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }
            ]}>
              <Text style={[
                tw`text-white text-xs`, 
                { fontFamily: isWeb ? 'Outfit, sans-serif' : 'outfit-medium', fontWeight: isWeb ? '500' : undefined }
              ]}>
                {getCountdownText(upcomingAppointments[0].date)}
              </Text>
            </View>
            
            {/* Date and Time Row - Adjusted for mobile */}
            <View style={tw`flex ${isMobileWeb ? 'flex-col' : 'flex-row flex-wrap'} justify-between mb-3`}>
              <View style={tw`flex flex-row items-center mb-1 ${isWeb && !isMobileWeb ? 'mr-4' : ''}`}>
                <Ionicons name="calendar" size={16} color="#2563eb" style={tw`mr-1`} />
                <Text style={[
                  tw`text-blue-800`, 
                  { fontFamily: isWeb ? 'Outfit, sans-serif' : 'outfit-medium', fontWeight: isWeb ? '500' : undefined }
                ]}>
                  {formatAppointmentDate(upcomingAppointments[0].date)}
                </Text>
              </View>
              <View style={tw`flex flex-row items-center mb-1`}>
                <Ionicons name="time" size={16} color="#2563eb" style={tw`mr-1`} />
                <Text style={[
                  tw`text-blue-800`, 
                  { fontFamily: isWeb ? 'Outfit, sans-serif' : 'outfit-medium', fontWeight: isWeb ? '500' : undefined }
                ]}>
                  {upcomingAppointments[0].time.substring(0, 5)}
                </Text>
              </View>
            </View>
            
            {/* Purpose and Method - Adjusted for mobile */}
            <View style={tw`flex ${isMobileWeb ? 'flex-col' : 'flex-row flex-wrap'} justify-between mb-4`}>
              <View style={tw`flex flex-row items-center mb-1 ${isWeb && !isMobileWeb ? 'mr-4' : ''}`}>
                <Ionicons name="clipboard" size={16} color="#2563eb" style={tw`mr-1`} />
                <Text style={[
                  tw`text-blue-800`, 
                  { fontFamily: isWeb ? 'Outfit, sans-serif' : 'outfit-medium', fontWeight: isWeb ? '500' : undefined }
                ]}>
                  {upcomingAppointments[0].purpose}
                </Text>
              </View>
              <View style={tw`flex flex-row items-center mb-1`}>
                <Ionicons name={upcomingAppointments[0].appointment_method === "Virtual" ? "globe" : "location"} 
                  size={16} color="#2563eb" style={tw`mr-1`} />
                <Text style={[
                  tw`text-blue-800 capitalize`, 
                  { fontFamily: isWeb ? 'Outfit, sans-serif' : 'outfit-medium', fontWeight: isWeb ? '500' : undefined }
                ]}>
                  {upcomingAppointments[0].appointment_method}
                </Text>
              </View>
            </View>
            
            {/* Doctor info and meeting controls - Adjusted for all platforms */}
            <View style={tw`flex ${isMobileWeb || !isWeb ? 'flex-col' : 'flex-row'} ${isWeb ? 'items-start' : ''}`}>
              {upcomingAppointments[0].doctor_image_url ? (
                <Image 
                  source={{ uri: upcomingAppointments[0].doctor_image_url }} 
                  style={tw`${isMobileWeb ? 'w-20 h-20 self-center' : 'w-16 h-16'} rounded-xl border-2 border-white ${isMobileWeb ? 'mb-4' : 'mr-4'}`}
                  resizeMode="cover"
                />          
              ) : (
                <View style={tw`${isMobileWeb ? 'w-20 h-20 self-center' : 'w-16 h-16'} rounded-xl bg-blue-200 items-center justify-center border-2 border-white ${isMobileWeb ? 'mb-4' : 'mr-4'}`}>
                  <Ionicons name="person" size={32} color="#2563eb" />
                </View>
              )}
              
              <View style={tw`flex-1 ${isMobileWeb ? 'items-center' : ''}`}>
                <Text style={[
                  tw`text-base text-gray-900 ${isMobileWeb ? 'text-center' : ''}`, 
                  { fontFamily: isWeb ? 'Outfit, sans-serif' : 'outfit-bold', fontWeight: isWeb ? '700' : undefined }
                ]}>
                  Dr. {upcomingAppointments[0].doctor_first_name}
                </Text>
                <Text style={[
                  tw`text-sm text-gray-600 capitalize mb-2 ${isMobileWeb ? 'text-center' : ''}`, 
                  { fontFamily: isWeb ? 'Outfit, sans-serif' : 'outfit' }
                ]}>
                  {upcomingAppointments[0].doctor_specialization}
                </Text>
                
                {/* Status badge */}
                <View style={tw`mb-3 ${isMobileWeb ? 'flex items-center' : ''}`}>
                  <View style={tw`${statusColors.bg} rounded-full px-2 py-1 flex flex-row items-center self-start`}>
                    <Text style={[
                      tw`text-xs ${statusColors.text} capitalize`, 
                      { fontFamily: isWeb ? 'Outfit, sans-serif' : 'outfit-medium', fontWeight: isWeb ? '500' : undefined }
                    ]}>
                      {upcomingAppointments[0].status}
                    </Text>
                  </View>
                </View>
                
                {/* Meeting buttons - Adjusted for all platforms */}
                <View style={tw`${isWeb && !isMobileWeb ? 'flex flex-row' : 'flex flex-col w-full'}`}>
                  {isMeetingAvailable(upcomingAppointments[0].date) ? (
                    <TouchableOpacity 
                      onPress={() => handleMeetingLink(upcomingAppointments[0].meet_link)}
                      style={[
                        tw`bg-blue-600 px-4 py-2 rounded-lg flex flex-row items-center shadow-sm justify-center`,
                        isWeb && !isMobileWeb ? tw`mr-2` : tw`mb-2 w-full`
                      ]}
                    >
                      <Ionicons name="videocam" size={16} color="#ffffff" />
                      <Text style={[
                        tw`ml-1 text-white`, 
                        { fontFamily: isWeb ? 'Outfit, sans-serif' : 'outfit-medium', fontWeight: isWeb ? '500' : undefined }
                      ]}>
                        Join Meeting
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      onPress={showMeetingAlert}
                      style={[
                        tw`bg-white border border-blue-600 px-4 py-2 rounded-lg flex flex-row items-center shadow-sm opacity-70 justify-center`,
                        isWeb && !isMobileWeb ? tw`mr-2` : tw`mb-2 w-full`
                      ]}
                    >
                      <Ionicons name="information-circle" size={16} color="#2563eb" />
                      <Text style={[
                        tw`ml-1 text-blue-600`, 
                        { fontFamily: isWeb ? 'Outfit, sans-serif' : 'outfit-medium', fontWeight: isWeb ? '500' : undefined }
                      ]}>
                        Available {getTimeUntilAvailable()}
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  {/* Meeting link button - Will now check availability before actually opening the link */}
                  {upcomingAppointments[0].appointment_method === "Virtual" && upcomingAppointments[0].meet_link && (
                    <TouchableOpacity 
                      onPress={() => handleMeetingLink(upcomingAppointments[0].meet_link)}
                      style={[
                        tw`${isMeetingAvailable(upcomingAppointments[0].date) ? 'bg-white border border-blue-600' : 'bg-gray-100 border border-gray-300'} px-4 py-2 rounded-lg flex flex-row items-center shadow-sm justify-center`,
                        isWeb && !isMobileWeb ? '' : tw`mt-2 w-full`
                      ]}
                    >
                      <Ionicons name="link" size={16} color={isMeetingAvailable(upcomingAppointments[0].date) ? "#2563eb" : "#6b7280"} />
                      <Text style={[
                        tw`ml-1 ${isMeetingAvailable(upcomingAppointments[0].date) ? 'text-blue-600' : 'text-gray-500'}`, 
                        { fontFamily: isWeb ? 'Outfit, sans-serif' : 'outfit-medium', fontWeight: isWeb ? '500' : undefined }
                      ]}>
                        Meeting Link
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
            
            {/* Additional appointment details */}
            {upcomingAppointments[0].details && (
              <View style={tw`mt-4 pt-4 border-t border-blue-100`}>
                <Text style={[
                  tw`text-sm text-gray-700 mb-1`, 
                  { fontFamily: isWeb ? 'Outfit, sans-serif' : 'outfit-medium', fontWeight: isWeb ? '500' : undefined }
                ]}>
                  Appointment Details:
                </Text>
                <Text style={[
                  tw`text-sm text-gray-600`, 
                  { fontFamily: isWeb ? 'Outfit, sans-serif' : 'outfit' }
                ]}>
                  {upcomingAppointments[0].details}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={tw`items-center justify-center py-8`}>
            <Ionicons name="calendar-outline" size={50} color="#d1d5db" />
            <Text style={[
              tw`text-gray-400 mt-4 text-center`, 
              { fontFamily: isWeb ? 'Outfit, sans-serif' : 'outfit-medium', fontWeight: isWeb ? '500' : undefined }
            ]}>
              No upcoming appointments
            </Text>
            <TouchableOpacity 
              style={tw`bg-blue-600 px-4 py-2 mt-4 rounded-lg flex flex-row items-center shadow-sm`}
              onPress={() => router.push('/(tabs)/doctors')}
            >
              <Ionicons name="add-circle" size={16} color="#ffffff" />
              <Text style={[
                tw`ml-1 text-white`, 
                { fontFamily: isWeb ? 'Outfit, sans-serif' : 'outfit-medium', fontWeight: isWeb ? '500' : undefined }
              ]}>
                Book an Appointment
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Dashboard content for web layout
  const WebDashboard = () => {
    return (
      <View style={tw`flex-row flex-wrap -mx-3`}>
        {/* Left column (Stats summary) */}
        <View style={tw`w-full md:w-1/3 px-3 mb-6`}>
          {/* Removed Wallet Card from here */}
          
          {/* Upcoming appointment card */}
          {renderUpcomingAppointment()}
          
          {/* <View style={tw`bg-white rounded-xl shadow-md p-4 mb-6`}>
            <Text style={[
              tw`text-lg text-gray-900 mb-4`, 
              { fontFamily: 'Outfit, sans-serif', fontWeight: '700' }
            ]}>
              Health Stats
            </Text>
            
            <View style={tw`space-y-4`}>
              {[
                { label: 'Heart Rate', value: healthStats.heartRate, unit: 'bpm', icon: 'heart', color: '#ef4444' },
                { label: 'Blood Pressure', value: healthStats.bloodPressure, unit: 'mmHg', icon: 'fitness', color: '#3b82f6' },
                { label: 'Steps Today', value: healthStats.steps, unit: '', icon: 'footsteps', color: '#10b981' },
                { label: 'Sleep', value: healthStats.sleep, unit: 'hrs', icon: 'moon', color: '#6366f1' }
              ].map((stat, index) => (
                <View key={index} style={tw`flex-row items-center p-3 bg-gray-50 rounded-lg`}>
                  <View style={[tw`mr-3 p-2 rounded-full`, { backgroundColor: `${stat.color}20` }]}>
                    <Ionicons name={stat.icon} size={20} color={stat.color} />
                  </View>
                  <View style={tw`flex-1`}>
                    <Text style={[
                      tw`text-gray-500 text-xs`, 
                      { fontFamily: 'Outfit, sans-serif' }
                    ]}>
                      {stat.label}
                    </Text>
                    <Text style={[
                      tw`text-gray-900 text-lg`, 
                      { fontFamily: 'Outfit, sans-serif', fontWeight: '600' }
                    ]}>
                      {stat.value} {stat.unit && <Text style={tw`text-sm text-gray-500`}>{stat.unit}</Text>}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View> */}

          <View style={tw`mb-6 ${isWeb && windowWidth >= 768 ? '' : 'px-6'}`}>
      <Text style={[
        tw`text-lg text-gray-900 mb-4 ${isWeb && windowWidth >= 768 ? '' : 'px-1'}`, 
        { fontFamily: isWeb ? 'Outfit, sans-serif' : 'outfit-bold', fontWeight: isWeb ? '700' : undefined }
      ]}>
        Quick Access
      </Text>
      
      <View style={tw`flex-row flex-wrap ${isWeb && windowWidth >= 768 ? '-mx-2' : ''}`}>
        {quickActions.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={tw`${isWeb && windowWidth >= 768 ? columnWidth : 'w-1/2'} p-2`}
            onPress={() => router.push(item.route)}
          >
            <View style={[
              tw`${item.color} rounded-xl shadow-sm overflow-hidden`,
              isWeb && windowWidth >= 768 
                ? tw`flex-row items-center p-4 ${isWeb ? 'hover:shadow-md transition-all duration-200 ease-in-out' : ''}`
                : tw`items-center p-4`
            ]}>
              <View style={tw`${isWeb && windowWidth >= 768 ? 'mr-3' : 'mb-2'} bg-white p-3 rounded-full`}>
                <Ionicons name={item.icon} size={24} color={item.iconColor} />
              </View>
              <Text style={[
                tw`text-gray-900`,
                { fontFamily: isWeb ? 'Outfit, sans-serif' : 'outfit-medium', fontWeight: isWeb ? '500' : undefined }
              ]}>
                {item.title}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
        </View>
      
      </View>
    );
  };

  return (
    <SafeAreaView style={[tw`flex-1 bg-gray-50`, { paddingTop: isWeb ? 0 : Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      {isWeb && <WebNavBar />}
      
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={[
          isWeb ? tw`px-6 pb-8` : tw`pb-8`,
          getContainerStyle()
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderHeader()}
        
        {isWeb && windowWidth >= 768 ? (
          <WebDashboard />
        ) : (
          <>
            {/* Removed Wallet Card from here */}
            
            {renderUpcomingAppointment()}
            
            {/* Quick actions grid */}
            <View style={tw`mb-6`}>
              <Text style={[
                tw`text-lg text-gray-900 mb-4 px-6`, 
                { fontFamily: isWeb ? 'Outfit, sans-serif' : 'outfit-bold', fontWeight: isWeb ? '700' : undefined }
              ]}>
                Quick Access
              </Text>
              
              <View style={tw`flex-row flex-wrap px-4`}>
                {quickActions.map((item, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={tw`w-1/2 p-2`}
                    onPress={() => router.push(item.route)}
                  >
                    <View style={[tw`${item.color} p-4 rounded-xl items-center`]}>
                      <View style={tw`bg-white p-3 rounded-full mb-2`}>
                        <Ionicons name={item.icon} size={24} color={item.iconColor} />
                      </View>
                      <Text style={[
                        tw`text-gray-900`, 
                        { fontFamily: isWeb ? 'Outfit, sans-serif' : 'outfit-medium', fontWeight: isWeb ? '500' : undefined }
                      ]}>
                        {item.title}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      padding: 8, // Slightly larger padding
      borderRadius: 8,
      marginRight: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconContainer: {
      width: 50,
      height: 50,
      borderRadius: 25,
      resizeMode: 'contain', // or 'cover' if you want it to fill the space
    },    
    brandText: {
      fontSize: 22, // Slightly larger text
      fontWeight: '600',
      // For Android fallback when MaskedView isn't used
      color: '#0369a1', // Richer blue
      // We'll style as best we can for platforms without MaskedView
      ...(Platform.OS !== 'ios' && {
        textShadowColor: '#15803d', // Deeper green
        // textShadowOffset: { width: -3, height: 0 },
        // textShadowRadius: 4,
      }),
    },
    // New styles for header wallet
    headerWalletContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      borderRadius: 12,
      padding: 10,
      minWidth: 120,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    headerWalletContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerWalletIcon: {
      marginRight: 8,
      opacity: 0.9,
    },
    headerWalletLabel: {
      fontSize: 12,
      color: '#FFFFFF',
      opacity: 0.8,
    },
    headerWalletAmount: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    walletCardContainer: {
      marginBottom: 16,
      borderRadius: 16,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    walletCard: {
      borderRadius: 16,
      padding: 16,
    },
    walletContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    walletTextContainer: {
      flex: 1,
    },
      walletLabel: {
        fontSize: 14,
        color: '#FFFFFF',
        opacity: 0.9,
      },
      walletAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
      },
      walletIconContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 50,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
      },
      viewWalletContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
      },
      viewWalletText: {
        color: '#FFFFFF',
        fontSize: 14,
        marginRight: 5,
      }
    });

const shareInvitation = async () => {
  const message = "Join me to book an appointment on AfyaMkononi! Download here: https://afyamkononi.co.ke/patient";
  
  try {
    if (Platform.OS === 'web') {
      // Web sharing
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Join me on AfyaMkononi',
            text: message,
            url: 'https://afyamkononi.co.ke/patient'
          });
        } catch (error) {
          // Handle cancellation or error
          if (error.name !== 'AbortError') {
            // If it's not a user cancellation, show an error
            Alert.alert('Sharing Error', 'Unable to share. Please try again.');
          }
        }
      } else {
        // Fallback for browsers without Web Share API
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
      // Native sharing for mobile
      const result = await Share.share({
        message: message,
        title: 'Join me on AfyaMkononi',
      });
      
      if (result.action === Share.sharedAction) {
        console.log('Content shared successfully');
      } else if (result.action === Share.dismissedAction) {
        console.log('Share dismissed');
      }
    }
  } catch (error) {
    console.error('Error sharing:', error);
    Alert.alert('Error', 'Could not share invitation. Please try again.');
  }
};

// Add this function after your existing shareInvitation function in index.js
const shareInvitationViaSMS = async () => {
  const message = "Join me to book an appointment on AfyaMkononi! Download here: https://afyamkononi.co.ke/patient";
  
  try {
    // Check if running on a mobile platform
    if (Platform.OS !== 'web') {
      // Use the device's native share sheet which includes SMS options
      const result = await Share.share({
        message: message,
        title: 'Share AfyaMkononi',
      });
      
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Shared with activity type (iOS)
          console.log(`Shared with ${result.activityType}`);
        } else {
          // Shared (Android)
          console.log('Shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        // User dismissed the share sheet
        console.log('Share dismissed');
      }
    } else {
      // Web fallback
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Join me on AfyaMkononi',
            text: message,
            url: 'https://afyamkononi.co.ke/patient'
          });
        } catch (error) {
          console.log('Error sharing', error);
          // Only show alert for non-abort errors
          if (error.name !== 'AbortError') {
            Alert.alert('Sharing Error', 'Unable to share on this device.');
          }
        }
      } else {
        // Manual copy fallback for web
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
                    .then(() => Alert.alert('Success', 'Invitation copied to clipboard!'))
                    .catch(err => Alert.alert('Error', 'Failed to copy message.'));
                }
              } 
            }
          ]
        );
      }
    }
  } catch (error) {
    console.error('Error sharing:', error);
    Alert.alert('Error', 'Could not share invitation. Please try again.');
  }
};