import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  Animated, 
  Easing, 
  Dimensions, 
  TouchableOpacity, 
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUpcomingAppointments } from "../../services/appointmentService";
import tw from "tailwind-react-native-classnames";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as jwt_decode from "jwt-decode"; // Fixed import statement


const AppointmentList = () => {
  const router = useRouter();
  const spinValue = new Animated.Value(0);
  const bounceValue = new Animated.Value(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [user, setUser] = useState({ name: '' });
  const [token, setToken] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    scheduled: 0,
    pending: 0,
    cancelled: 0
  });
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  

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
  
  const fetchAppointments = useCallback(async () => {
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

        const appointments = await getUpcomingAppointments();
        setAppointments(appointments);
        setFilteredAppointments(appointments);
        
        // Calculate stats
        const stats = calculateStats(appointments);
        setStats(stats);
        
        // Animate the cards when appointments are loaded
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      console.error("Error retrieving appointments:", error);
    }
  }, [fadeAnim]);

  const calculateStats = (appointments) => {
    const stats = {
      total: appointments.length,
      scheduled: 0,
      pending: 0,
      cancelled: 0
    };

    appointments.forEach(appointment => {
      const status = appointment.status.toLowerCase();
      if (status === 'scheduled') {
        stats.scheduled++;
      } else if (status === 'pending') {
        stats.pending++;
      } else if (status === 'cancelled' || status === 'not') {
        stats.cancelled++;
      }
    });

    return stats;
  };

  const filterAppointments = (filter) => {
    setActiveFilter(filter);
    
    if (filter === 'all') {
      setFilteredAppointments(appointments);
      return;
    }
    
    const filtered = appointments.filter(appointment => {
      const status = appointment.status.toLowerCase();
      if (filter === 'scheduled' && status === 'scheduled') return true;
      if (filter === 'pending' && status === 'pending') return true;
      if (filter === 'cancelled' && (status === 'cancelled' || status === 'not')) return true;
      return false;
    });
    
    setFilteredAppointments(filtered);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Reset fade animation before fetching
    fadeAnim.setValue(0);
    
    await fetchAppointments();
    setRefreshing(false);
  }, [fetchAppointments, fadeAnim]);

  useEffect(() => {
    fetchAppointments();
    
    // Update current time every minute to check meeting link availability
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, [fetchAppointments]);

  useEffect(() => {
    if (appointments.length === 0) {
      // Spinning animation
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // Bouncing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceValue, {
            toValue: 1,
            duration: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(bounceValue, {
            toValue: 0,
            duration: 1000,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [appointments]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const bounce = bounceValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20]
  });

  // Helper function to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Helper function to format time
  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
  
  // Determine if meeting link should be clickable
  const isMeetingLinkActive = (appointmentDate, appointmentTime) => {
    if (!appointmentDate || !appointmentTime) return false;
    
    const apptDateTime = new Date(appointmentDate);
    const [hours, minutes] = appointmentTime.split(':');
    apptDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    
    // Calculate time difference in minutes
    const timeDiffMs = apptDateTime.getTime() - currentTime.getTime();
    const timeDiffMinutes = timeDiffMs / (1000 * 60);
    
    // Active between 10 minutes before and 20 minutes after
    return timeDiffMinutes >= -10 && timeDiffMinutes <= 20;
  };

  // Helper function to get appointment method icon
  const getMethodIcon = (method) => {
    switch (method) {
      case 'in-person':
        return { name: 'hospital-o', color: '#4285F4' };
      case 'online':
        return { name: 'video-camera', color: '#0F9D58' };
      case 'phone':
        return { name: 'phone', color: '#DB4437' };
      default:
        return { name: 'calendar', color: '#6C63FF' };
    }
  };

  // Helper function to get status color and icon
  const getStatusInfo = (status) => {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return { 
          color: '#4CAF50',
          icon: 'check-circle',
          label: 'Confirmed'
        };
      case 'pending':
        return { 
          color: '#FFC107',
          icon: 'clock-o',
          label: 'Pending Doctor\'s Approval'
        };
      case 'cancelled':
      case 'not': // Handle the 'not' status from original code
        return { 
          color: '#F44336',
          icon: 'times-circle',
          label: 'Cancelled'
        };
      default:
        return { 
          color: '#9E9E9E',
          icon: 'question-circle',
          label: status.charAt(0).toUpperCase() + status.slice(1)
        };
    }
  };
  
  // Handle meeting link press
  const handleMeetingLinkPress = (link) => {
    if (link && link.trim() !== '') {
      if (!link.startsWith('http')) {
        link = 'https://' + link;
      }
      Linking.openURL(link).catch(err => 
        console.error('Error opening meeting link:', err)
      );
    }
  };

  // Header with stats section
  const HeaderWithStats = () => (
    <>
      <LinearGradient 
        colors={['#002244', '#0056A3']} 
        start={{x: 0, y: 0}} 
        end={{x: 1, y: 1}}
        style={tw`px-6 pt-12 pb-6 rounded-b-3xl shadow-xl`}
      >
        <View style={tw`flex-row justify-between items-center`}>
          <Text style={tw`text-2xl text-white font-bold tracking-tight`}>
            Upcoming Appointments
          </Text>
          
          <View style={tw`flex-row space-x-3`}>
            <TouchableOpacity
              style={tw`p-2 bg-white/10 rounded-full`}
              onPress={onRefresh}
              activeOpacity={0.7}
            >
              <MaterialIcons name="refresh" size={22} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={tw`p-2 bg-white/10 rounded-full`}
              onPress={() => router.push('/(tabs)/')}
            >
              <MaterialIcons name="home" size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
      
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, {borderColor: '#4CAF50'}]}>
          <Text style={[styles.statNumber, {color: '#4CAF50'}]}>{stats.scheduled}</Text>
          <Text style={styles.statLabel}>Confirmed</Text>
        </View>
        <View style={[styles.statCard, {borderColor: '#FFC107'}]}>
          <Text style={[styles.statNumber, {color: '#FFC107'}]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending Approval</Text>
        </View>
        <View style={[styles.statCard, {borderColor: '#F44336'}]}>
          <Text style={[styles.statNumber, {color: '#F44336'}]}>{stats.cancelled}</Text>
          <Text style={styles.statLabel}>Cancelled</Text>
        </View>
      </View>
      
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            activeFilter === 'all' && styles.activeFilter
          ]}
          onPress={() => filterAppointments('all')}
        >
          <Text style={[
            styles.filterText, 
            activeFilter === 'all' && styles.activeFilterText
          ]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            activeFilter === 'scheduled' && [styles.activeFilter, {borderColor: '#4CAF50', backgroundColor: '#4CAF5010'}]
          ]}
          onPress={() => filterAppointments('scheduled')}
        >
          <Text style={[
            styles.filterText, 
            activeFilter === 'scheduled' && [styles.activeFilterText, {color: '#4CAF50'}]
          ]}>Confirmed</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            activeFilter === 'pending' && [styles.activeFilter, {borderColor: '#FFC107', backgroundColor: '#FFC10710'}]
          ]}
          onPress={() => filterAppointments('pending')}
        >
          <Text style={[
            styles.filterText, 
            activeFilter === 'pending' && [styles.activeFilterText, {color: '#FFC107'}]
          ]}>Pending Approval</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            activeFilter === 'cancelled' && [styles.activeFilter, {borderColor: '#F44336', backgroundColor: '#F4433610'}]
          ]}
          onPress={() => filterAppointments('cancelled')}
        >
          <Text style={[
            styles.filterText, 
            activeFilter === 'cancelled' && [styles.activeFilterText, {color: '#F44336'}]
          ]}>Cancelled</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const handlePayment = async (appointmentId, consultationFee) => {

    try {
      setSubmitting(true);
      
      const response = await fetch(
        `https://api.afyamkononi.co.ke/api/v1.0/stk-push`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            appointmentId: appointmentId,
            PhoneNumber: user.number,
            PartyA: user.number,
            Amount: consultationFee
          }),
        }
      );

      const data = await response.json();
      
      if (response.ok && data.success) {
        // showToast('success', 'Deposit request submitted successfully');
        setDepositModalVisible(false);
        setDepositAmount('');
        
        // Refresh wallet data
        fetchWalletData(authToken, phoneNumber);
      } else {
        // showToast('error', data.message || 'Failed to process deposit');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      // showToast('error', error.message || 'Failed to process deposit');
    } finally {
      // setSubmitting(false);
    }
  };

  return (
    <View style={styles.pageContainer}>
      {/* Common header with stats for both empty and populated states */}
      <HeaderWithStats />
      
      {filteredAppointments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyContent}>
            <Animated.View style={{ 
              transform: [
                { translateY: bounce },
                { rotate: spin }
              ] 
            }}>
              <FontAwesome name="calendar-plus-o" size={80} color="#6C63FF" />
            </Animated.View>
            
            <Text style={styles.emptyTitle}>
              {appointments.length === 0 ? "No Appointments Yet" : "No Matching Appointments"}
            </Text>
            
            <Text style={styles.emptyText}>
              {appointments.length === 0 
                ? "Your schedule is clear for now. When you book appointments, they'll appear here."
                : "There are no appointments matching the selected filter."}
            </Text>
  
            {appointments.length === 0 && (
              <View style={styles.tipsContainer}>
                <Text style={styles.tipsTitle}>Quick Tips:</Text>
                <View style={styles.tipItem}>
                  <FontAwesome name="clock-o" size={20} color="#555" style={styles.tipIcon} />
                  <Text style={styles.tipText}>Book appointments in advance</Text>
                </View>
                <View style={styles.tipItem}>
                  <FontAwesome name="calendar-check-o" size={20} color="#555" style={styles.tipIcon} />
                  <Text style={styles.tipText}>Choose your preferred consultation method</Text>
                </View>
                <View style={styles.tipItem}>
                  <FontAwesome name="bell" size={20} color="#555" style={styles.tipIcon} />
                  <Text style={styles.tipText}>Enable notifications to stay updated</Text>
                </View>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={onRefresh}
              activeOpacity={0.7}
            >
              <MaterialIcons name="refresh" size={22} color="#FFFFFF" />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView 
          style={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4285F4', '#0F9D58', '#F4B400', '#DB4437']}
              tintColor="#6C63FF"
            />
          }
        >
          {filteredAppointments.map((appointment, index) => {
            const methodInfo = getMethodIcon(appointment.appointment_method);
            const statusInfo = getStatusInfo(appointment.status);
            const isLinkActive = isMeetingLinkActive(appointment.date, appointment.time);
            
            return (
              <Animated.View 
                key={appointment.id} 
                style={[
                  styles.appointmentCard,
                  {opacity: fadeAnim, transform: [{translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  })}]}
                ]}
              >
                <View style={styles.cardTop}>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: statusInfo.color + '20', borderColor: statusInfo.color }
                  ]}>
                    <FontAwesome name={statusInfo.icon} size={14} color={statusInfo.color} style={{marginRight: 4}} />
                    <Text style={[styles.statusText, {color: statusInfo.color}]}>
                      {statusInfo.label}
                    </Text>
                  </View>
                  
                  <View style={styles.dateChip}>
                    <MaterialIcons name="event" size={14} color="#555" />
                    <Text style={styles.dateChipText}>{formatDate(appointment.date)}</Text>
                  </View>
                </View>
  
                <View style={styles.doctorInfoContainer}>
                  <View style={[styles.methodIconContainer, {backgroundColor: methodInfo.color + '15'}]}>
                    <FontAwesome name={methodInfo.name} size={24} color={methodInfo.color} />
                  </View>
                  
                  <View style={styles.doctorInfo}>
                    <Text style={styles.doctorName}>Dr. {appointment.doctor_first_name}</Text>
                    <Text style={styles.specialization}>{appointment.doctor_specialization}</Text>
                    
                    <View style={styles.timeContainer}>
                      <MaterialIcons name="access-time" size={16} color="#555" />
                      <Text style={styles.timeText}>{formatTime(appointment.time)}</Text>
                    </View>
                  </View>
                </View>
  
                {/* Payment Status Section */}
                {(appointment.payment_status === 'PendingPayment' || appointment.payment_status === 'CompletedPayment') && (
                  <View style={styles.paymentSection}>
                    {appointment.payment_status === 'PendingPayment' ? (
                      <TouchableOpacity 
                        style={styles.payNowButton}
                        onPress={() => handlePayment(appointment.id, appointment.consultation_fee)}
                        activeOpacity={0.7}
                      >
                        <FontAwesome name="credit-card" size={16} color="#FFFFFF" style={{marginRight: 8}} />
                        <Text style={styles.payNowButtonText}>Pay Now</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.paymentCompletedBadge}>
                        <FontAwesome name="check-circle" size={16} color="#0F9D58" style={{marginRight: 6}} />
                        <Text style={styles.paymentCompletedText}>Payment Completed</Text>
                      </View>
                    )}
                  </View>
                )}
  
                {appointment.purpose && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Purpose:</Text>
                    <Text style={styles.detailText}>{appointment.purpose}</Text>
                  </View>
                )}
  
                {appointment.details && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Details:</Text>
                    <Text style={styles.detailText}>{appointment.details}</Text>
                  </View>
                )}
  
                {appointment.meet_link && (
                  <View style={styles.meetLinkContainer}>
                    <View style={styles.meetLinkRow}>
                      <MaterialIcons name="videocam" size={18} color={isLinkActive ? "#4285F4" : "#999"} />
                      <Text style={[styles.meetLinkLabel, {color: isLinkActive ? "#4285F4" : "#999"}]}>
                        Meeting Link
                      </Text>
                    </View>
                    
                    {isLinkActive ? (
                      <TouchableOpacity 
                        style={styles.activeMeetLink}
                        onPress={() => handleMeetingLinkPress(appointment.meet_link)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.activeMeetLinkText} numberOfLines={1}>
                          {appointment.meet_link}
                        </Text>
                        <MaterialIcons name="open-in-new" size={16} color="#4285F4" />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.inactiveMeetLink}>
                        <Text style={styles.inactiveMeetLinkText} numberOfLines={1}>
                          {appointment.meet_link}
                        </Text>
                        <View style={styles.timingBadge}>
                          <Text style={styles.timingBadgeText}>Available 10 min before</Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </Animated.View>
            );
          })}
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    justifyContent: 'space-around',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#f8f9fa',
  },
  activeFilter: {
    borderColor: '#4285F4',
    backgroundColor: '#E8F0FE',
  },
  filterText: {
    fontSize: 13,
    color: '#757575',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#4285F4',
    fontWeight: '600',
  },
  headerContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
  },
  refreshIconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f4ff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 12,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
    justifyContent: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyTitle: {
    marginTop: 30,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#616161',
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  tipsContainer: {
    marginTop: 30,
    width: '100%',
    padding: 20,
    backgroundColor: '#f7f8ff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e8eafd',
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 15,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  tipIcon: {
    marginRight: 12,
  },
  tipText: {
    fontSize: 15,
    color: '#616161',
    flex: 1,
    lineHeight: 20,
  },
  refreshButton: {
    marginTop: 30,
    backgroundColor: '#6C63FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  appointmentCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dateChipText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 4,
    fontWeight: '500',
  },
  doctorInfoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  methodIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 2,
  },
  specialization: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timeText: {
    fontSize: 15,
    color: '#555',
    fontWeight: '500',
    marginLeft: 6,
  },
  detailSection: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 2,
  },
  detailText: {
    fontSize: 14,
    color: '#616161',
    lineHeight: 20,
  },
  meetLinkContainer: {
    marginTop: 4,
    marginBottom: 4,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eeeeee',
  },
  meetLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  meetLinkLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  activeMeetLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e8f0fe',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d2e3fc',
  },
  activeMeetLinkText: {
    flex: 1,
    color: '#4285F4',
    fontSize: 14,
    marginRight: 8,
  },
  inactiveMeetLink: {
    backgroundColor: '#f1f1f1',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inactiveMeetLinkText: {
    color: '#9E9E9E',
    fontSize: 14,
    marginBottom: 6,
  },
  timingBadge: {
    backgroundColor: '#EEEEEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  timingBadgeText: {
    color: '#757575',
    fontSize: 11,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  rescheduleButton: {
    borderColor: '#FFC107',
    backgroundColor: '#FFF8E1',
  },
  rescheduleText: {
    color: '#FFA000',
  },
  cancelButton: {
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  cancelText: {
    color: '#D32F2F',
  },
  contactButton: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  contactText: {
    color: '#388E3C',
  },
  bottomPadding: {
    height: 100,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#616161',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalCancelButton: {
    backgroundColor: '#f5f5f5',
  },
  modalCancelText: {
    color: '#757575',
    fontWeight: '600',
  },
  modalConfirmButton: {
    backgroundColor: '#F44336',
  },
  modalConfirmText: {
    color: 'white',
    fontWeight: '600',
  },
  paymentSection: {
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 5,
  },
  
  // Pay Now button
  payNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  
  payNowButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  
  // Payment completed badge
  paymentCompletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4EA',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#CEEAD6',
  },
  
  paymentCompletedText: {
    color: '#0F9D58',
    fontWeight: '500',
    fontSize: 14,
  },
});

export default AppointmentList;