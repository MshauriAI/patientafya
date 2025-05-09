import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
    View, StyleSheet, FlatList, TouchableOpacity, StatusBar, Image, 
    Dimensions, Modal, ScrollView, Alert, TextInput, Platform, Animated, 
    KeyboardAvoidingView, RefreshControl, ActivityIndicator 
  } from 'react-native';import { Text, Searchbar, Button } from 'react-native-paper';
import { Provider as PaperProvider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDoctors, getSpecializations } from '../../services/doctorListingService';
import { bookAppointment } from '../../services/appointmentService';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, startOfWeek, 
    endOfWeek, isSameDay, addMonths, subMonths, isBefore, startOfToday, parseISO, addMinutes } from 'date-fns';
import { SafeAreaView } from 'react-native';
import SpecializationFilter from '../../utils/SpecializationFilter';
import SymptomSelector from '../../utils/symptomSelector';
import * as jwt_decode from "jwt-decode"; // Fixed import statement

// const { width, height } = Dimensions.get('window');
// const isWeb = Platform.OS === 'web';

const DateTimePicker = ({ consultationHours, onDateSelect, onTimeSelect, selectedDate, selectedTime }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [timeDropdownVisible, setTimeDropdownVisible] = useState(false);
    const timeButtonRef = useRef(null);
    const [timeButtonLayout, setTimeButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const today = startOfToday();
    const now = new Date(); // Current date and time

    // Get available days of the week from consultation hours
    const availableDays = useMemo(() => 
        [...new Set(consultationHours.map(slot => slot.day))],
        [consultationHours]
    );

    const isDateAvailable = (date) => {
        const dayName = format(date, 'EEEE');
        const dateString = format(date, 'yyyy-MM-dd');
        
        return (
            !isBefore(date, today) && 
            availableDays.includes(dayName) && 
            !(consultationHours.unavailableDates || []).includes(dateString)
        );
    };

    // Function to generate time slots based on multiple time ranges
    const generateTimeSlots = (hours) => {
        const slots = [];
        
        hours.forEach(timeRange => {
            const start = parseISO(`2000-01-01T${timeRange.start_time}`);
            const end = parseISO(`2000-01-01T${timeRange.end_time}`);
            let current = start;

            while (current < end) {
                slots.push(format(current, 'HH:mm:ss'));
                current = addMinutes(current, 30);
            }
        });

        return slots;
    };

    // Filter time slots to remove past times
    const filterPastTimeSlots = (slots, date) => {
        // If selected date is today, filter out past time slots
        if (isSameDay(date, now)) {
            return slots.filter(timeSlot => {
                const [hours, minutes] = timeSlot.split(':');
                const slotDate = new Date();
                slotDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
                return slotDate > now;
            });
        }
        
        // For future dates, return all slots
        return slots;
    };

    // Update time slots when date is selected
    useEffect(() => {
        if (selectedDate) {
            const dayName = format(selectedDate, 'EEEE');
            const daySlots = consultationHours
                .filter(slot => slot.day === dayName)
                .reduce((acc, slot) => {
                    const timeSlots = generateTimeSlots(slot.hours);
                    return [...acc, ...timeSlots];
                }, []);

            // Remove duplicates and sort
            const uniqueSlots = [...new Set(daySlots)].sort();
            
            // Filter out past time slots if the selected date is today
            const filteredSlots = filterPastTimeSlots(uniqueSlots, selectedDate);
            
            setAvailableTimeSlots(filteredSlots);
            
            // If the currently selected time is now in the past, clear it
            if (selectedTime && isSameDay(selectedDate, now)) {
                const [hours, minutes] = selectedTime.split(':');
                const selectedTimeDate = new Date();
                selectedTimeDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
                
                if (selectedTimeDate <= now) {
                    onTimeSelect(null);
                }
            }
        }
    }, [selectedDate, consultationHours, selectedTime]);

    const openCalendarDialog = () => {
        setCalendarVisible(true);
    };

    const closeCalendarDialog = () => {
        setCalendarVisible(false);
    };

    const openTimeDropdown = () => {
        if (timeButtonRef.current) {
            timeButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
                setTimeButtonLayout({ x: pageX, y: pageY, width, height });
                setTimeDropdownVisible(true);
            });
        }
    };

    const renderCalendar = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const dateFormat = "EEE";
        const days = [];
        const rows = [];

        let days_of_week = eachDayOfInterval({
            start: startDate,
            end: endDate
        });

        // Create header row with day names
        const header = days_of_week.slice(0, 7).map((day, idx) => (
            <View key={idx} style={styles.calendarHeaderCell}>
                <Text style={styles.calendarHeaderText}>{format(day, dateFormat)}</Text>
            </View>
        ));

        // Create calendar grid
        days_of_week.forEach((day, idx) => {
            const isAvailable = isDateAvailable(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, today);
            const isPastDate = isBefore(day, today);
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

            days.push(
                <TouchableOpacity
                    key={day.toString()}
                    style={[
                        styles.calendarDay,
                        isSelected && styles.calendarDaySelected,
                        (!isAvailable || isPastDate) && styles.calendarDayDisabled,
                        isToday && styles.calendarDayToday,
                        !isCurrentMonth && styles.calendarDayOtherMonth
                    ]}
                    onPress={() => {
                        if (isAvailable && !isPastDate && isCurrentMonth) {
                            onDateSelect(day);
                            closeCalendarDialog();
                        }
                    }}
                    disabled={!isAvailable || isPastDate || !isCurrentMonth}
                >
                    <Text style={[
                        styles.calendarDayText,
                        isSelected && styles.calendarDayTextSelected,
                        isToday && styles.calendarDayTextToday,
                        (!isAvailable || isPastDate) && styles.calendarDayTextDisabled,
                        !isCurrentMonth && styles.calendarDayTextOtherMonth
                    ]}>
                        {format(day, 'd')}
                    </Text>
                </TouchableOpacity>
            );

            if ((idx + 1) % 7 === 0) {
                rows.push(
                    <View key={day.toString()} style={styles.calendarRow}>
                        {days.slice(idx - 6, idx + 1)}
                    </View>
                );
            }
        });

        return (
            <Modal
                visible={calendarVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={closeCalendarDialog}
            >
                <View style={styles.calendarModalOverlay}>
                    <View style={styles.calendarModal}>
                        <View style={styles.calendar}>
                            <View style={styles.calendarHeader}>
                                <TouchableOpacity
                                    onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                    style={styles.calendarNavButton}
                                >
                                    <Ionicons name="chevron-back" size={24} color="#333" />
                                </TouchableOpacity>
                                <Text style={styles.calendarTitle}>
                                    {format(currentMonth, 'MMMM yyyy')}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                    style={styles.calendarNavButton}
                                >
                                    <Ionicons name="chevron-forward" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.calendarGrid}>
                                <View style={styles.calendarHeaderRow}>{header}</View>
                                {rows}
                            </View>
                        </View>
                        <View style={styles.calendarFooter}>
                            <TouchableOpacity 
                                style={styles.calendarCancelButton}
                                onPress={closeCalendarDialog}
                            >
                                <Text style={styles.calendarCancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    const renderTimeDropdown = () => {
        if (!selectedDate) return null;
        
        return (
            <>
                <TouchableOpacity 
                    ref={timeButtonRef}
                    style={styles.timePickerButton}
                    onPress={openTimeDropdown}
                >
                    <View style={styles.timePickerButtonContent}>
                        <Ionicons name="time-outline" size={20} color="#64748b" />
                        <Text style={styles.timePickerButtonText}>
                            {selectedTime ? format(parseISO(`2000-01-01T${selectedTime}`), 'h:mm a') : "Select a time"}
                        </Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color="#64748b" />
                </TouchableOpacity>
                
                <Modal
                    visible={timeDropdownVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setTimeDropdownVisible(false)}
                >
                    <TouchableOpacity 
                        style={styles.dropdownOverlay}
                        activeOpacity={1}
                        onPress={() => setTimeDropdownVisible(false)}
                    >
                        <View 
                            style={[
                                styles.timeDropdownContainer,
                                {
                                    top: timeButtonLayout.y + timeButtonLayout.height + 10,
                                    left: timeButtonLayout.x,
                                    width: timeButtonLayout.width,
                                }
                            ]}
                        >
                            <ScrollView style={styles.timeDropdownScroll}>
                                {availableTimeSlots.map((time) => (
                                    <TouchableOpacity
                                        key={time}
                                        style={[
                                            styles.timeDropdownItem,
                                            selectedTime === time && styles.timeDropdownItemSelected
                                        ]}
                                        onPress={() => {
                                            onTimeSelect(time);
                                            setTimeDropdownVisible(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.timeDropdownItemText,
                                            selectedTime === time && styles.timeDropdownItemTextSelected
                                        ]}>
                                            {format(parseISO(`2000-01-01T${time}`), 'h:mm a')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                {availableTimeSlots.length === 0 && (
                                    <View style={styles.noTimeSlotsContainer}>
                                        <Text style={styles.noTimeSlotsText}>No time slots available</Text>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </>
        );
    };

    return (
        <View style={styles.dateTimePickerContainer}>
            {renderCalendar()}
            
            <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={openCalendarDialog}
            >
                <View style={styles.datePickerButtonContent}>
                    <Ionicons name="calendar-outline" size={20} color="#64748b" />
                    <Text style={styles.datePickerButtonText}>
                        {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : "Select a date"}
                    </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color="#64748b" />
            </TouchableOpacity>
            
            {renderTimeDropdown()}
        </View>
    );
};

const DoctorListing = () => {
    const router = useRouter();
    const { width } = Dimensions.get('window');
    const isWeb = Platform.OS === 'web';
    const isMobileWeb = isWeb && width < 768;
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [allDoctors, setAllDoctors] = useState(null);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [bookingModalVisible, setBookingModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [purpose, setPurpose] = useState('');
    const [details, setDetails] = useState('');
    const [purposeDropdownVisible, setPurposeDropdownVisible] = useState(false);
    const purposeButtonRef = useRef(null);
    const [purposeButtonLayout, setPurposeButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [bookingError, setBookingError] = useState(null);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [specializations, setSpecializations] = useState([]);
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);
    const animatedLoadingValue = useRef(new Animated.Value(0)).current;
    const [cancelButtonPressed, setCancelButtonPressed] = useState(false);
    const [isBookingDisabled, setIsBookingDisabled] = useState(false);
    // Add refreshing state for pull to refresh
    const [refreshing, setRefreshing] = useState(false);

    const verificationOptions = [
        { id: 'all', name: 'All Doctors', icon: '👨‍⚕️', description: 'Show all doctors regardless of verification status' },
        { id: 'verified', name: 'Verified Only', icon: '✓', description: 'Show only verified doctors who can be booked for appointments' },
        { id: 'unverified', name: 'Unverified', icon: '⚠️', description: 'Show only unverified doctors who are pending verification' },
    ];

    const visitPurposes = [
        "Annual Checkup",
        "Consultation",
        "Follow-up",
        "Urgent Care",
        "Vaccination",
        "Prescription Refill",
        "Lab Results Review",
        "Specialist Referral"
    ];
    
    const defaultCategories = [
        { id: 'all', name: 'All', icon: '👨‍⚕️' },
        { id: 'cardio', name: 'Cardiology', icon: '❤️' },
        { id: 'dental', name: 'Dentistry', icon: '🦷' },
        { id: 'eye', name: 'Ophthalmology', icon: '👁️' },
        { id: 'pediatric', name: 'Pediatrics', icon: '👶' },
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

    const fetchDoctors = async (showProgressAnimation = true) => {
        try {
            if (showProgressAnimation) {
                setIsLoading(true);
                
                // Simulate progress animation for loading state
                Animated.timing(animatedLoadingValue, {
                    toValue: 100,
                    duration: 2000,
                    useNativeDriver: false,
                }).start();
                
                // Simulate loading progress updates
                const progressInterval = setInterval(() => {
                    setLoadingProgress(prev => {
                        const next = prev + Math.random() * 15;
                        return next > 95 ? 95 : next;
                    });
                }, 300);
                
                const token = await AsyncStorage.getItem("token");
                if (token) {
                    const doctors = await getDoctors();
                    setTimeout(() => {
                        setAllDoctors(doctors);
                        setIsLoading(false);
                        setLoadingProgress(100);
                        clearInterval(progressInterval);
                    }, 1500); // Add slight delay to ensure animation completes
                }
            } else {
                // Simplified fetching for refresh
                const token = await AsyncStorage.getItem("token");
                if (token) {
                    const doctors = await getDoctors();
                    setAllDoctors(doctors);
                }
            }
        } catch (error) {
            console.error("Error fetching doctors:", error);
            setIsLoading(false);
            setLoadingProgress(100);
        }
    };

    useEffect(() => {
        fetchDoctors();
    }, []);

    // Handle pull to refresh
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchDoctors(false); // Pass false to skip the loading animation
        } catch (error) {
            console.error("Error refreshing doctors list:", error);
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        const fetchSpecializations = async () => {
            try {
                const token = await AsyncStorage.getItem("token");
                if (token) {
                    const response = await getSpecializations();
                    
                    if (response) {
                        const transformedData = [
                            { id: 'all', name: 'All', icon: '👨‍⚕️' }, // Keep "All" option
                            ...response.map(spec => ({
                                id: spec.id.toString(),
                                name: spec.specialization.charAt(0).toUpperCase() + spec.specialization.slice(1),
                                icon: getIconForSpecialization(spec.specialization)
                            }))
                        ];
                        
                        setSpecializations(transformedData);
                    } else {
                        // Fallback to default categories if API response is empty
                        setSpecializations(defaultCategories);
                    }
                }
            } catch (error) {
                console.error("Error fetching doctors' specializations:", error);
                // Fallback to default categories on error
                setSpecializations(defaultCategories);
            }
        };
        fetchSpecializations();
    }, []);
    
    // Helper function to assign icons
    const getIconForSpecialization = (specialization) => {
        const iconMap = {
            'anaesthetist': '💉',
            'anesthesia': '💉',
            'cardiology': '❤️',
            'dentistry': '🦷',
            'ophthalmology': '👁️',
            'pediatrics': '👶',
            'dermatology': '🧬',
            'neurology': '🧠',
            'orthopedics': '🦴',
            'gynecology': '👩‍⚕️',
            'urology': '🚽',
            'endocrinology': '⚗️',
            'gastroenterology': '🍽️',
            'psychiatry': '🧘',
            'oncology': '⚕️',
            'radiology': '📊',
            'hematology': '🩸',
            'nephrology': '💧',
            'pulmonology': '🫁',
            'rheumatology': '🦿',
            'allergy': '🤧',
            'general': '⚕️',
            // Add more as needed
        };
        
        const spec = specialization.toLowerCase();
        return iconMap[spec] || '👨‍⚕️'; // Default icon
    };

    // Filter doctors based on search query and active category
    const filteredDoctors = useMemo(() => {
        if (!allDoctors) return [];

        let filtered = allDoctors;

        // Filter by category
        if (activeCategory !== 'All') {
            // Find the specialization ID that matches the active category name
            const selectedSpecialization = specializations.find(
                spec => spec.name === activeCategory
            );
            
            if (selectedSpecialization && selectedSpecialization.name !== 'All') {
                filtered = filtered.filter(doctor => 
                    doctor.specialization && 
                    doctor.specialization.toLowerCase() === selectedSpecialization.name.toLowerCase()
                );
            }
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(doctor => 
                (doctor.name && doctor.name.toLowerCase().includes(query)) ||
                (doctor.specialization && doctor.specialization.toLowerCase().includes(query)) ||
                (doctor.affiliation && doctor.affiliation.toLowerCase().includes(query))
            );
        }

        return filtered;
    }, [allDoctors, searchQuery, activeCategory, specializations]);

    const handleSearch = (query) => {
        setSearchQuery(query);
    };

    const handleCategoryPress = (categoryName) => {
        setActiveCategory(categoryName);
        setSearchQuery(''); // Clear search when changing categories
    };

    const handleBookNowPress = (doctor) => {
        setSelectedDoctor(doctor);
        // Reset booking states when opening modal for a new booking
        setBookingSuccess(false);
        setBookingError(null);
        setBookingModalVisible(true);
    };

    const openPurposeDropdown = () => {
        if (purposeButtonRef.current) {
            purposeButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
                setPurposeButtonLayout({ x: pageX, y: pageY, width, height });
                setPurposeDropdownVisible(true);
            });
        }
    };

    const resetBookingForm = () => {
        setSelectedDoctor(null);
        setSelectedDate(null);
        setSelectedTime(null);
        setPurpose('');
        setDetails('');
        setBookingSuccess(false);
        setBookingError(null);
    };
    
    const handleSubmit = async () => {
        await fetch('http://<your-backend-url>/submit-symptoms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_id: '123',
            symptoms: selectedSymptoms,
          }),
        });
      };


    const VerificationBadge = ({ verified }) => (
    <View style={[
        styles.verificationBadge,
        verified ? styles.verifiedBadge : styles.unverifiedBadge
    ]}>
        <Ionicons 
        name={verified ? "shield-checkmark" : "alert-circle"} 
        size={14} 
        color={verified ? "#10b981" : "#f59e0b"} 
        />
        <Text style={[
        styles.verificationText,
        verified ? styles.verifiedText : styles.unverifiedText
        ]}>
        {verified ? "Verified" : "Unverified"}
        </Text>
    </View>
    );
    
    // Purpose dropdown component
    const renderPurposeDropdown = () => {
        return (
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Purpose of Visit</Text>
                <TouchableOpacity 
                    ref={purposeButtonRef}
                    style={styles.textInput}
                    onPress={openPurposeDropdown}
                >
                    <View style={styles.dropdownButtonContent}>
                        <Text style={purpose ? styles.dropdownButtonText : styles.dropdownPlaceholder}>
                            {purpose || "Select purpose of visit"}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#64748b" />
                    </View>
                </TouchableOpacity>
                
                <Modal
                    visible={purposeDropdownVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setPurposeDropdownVisible(false)}
                >
                    <TouchableOpacity 
                        style={styles.dropdownOverlay}
                        activeOpacity={1}
                        onPress={() => setPurposeDropdownVisible(false)}
                    >
                        <View 
                            style={[
                                styles.purposeDropdownContainer,
                                {
                                    top: purposeButtonLayout.y + purposeButtonLayout.height + 10,
                                    left: purposeButtonLayout.x,
                                    width: purposeButtonLayout.width,
                                }
                            ]}
                        >
                        <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                        style={{ flex: 1 }}
                        >
                            <ScrollView style={styles.purposeDropdownScroll}>
                                {visitPurposes.map((item) => (
                                    <TouchableOpacity
                                        key={item}
                                        style={[
                                            styles.purposeDropdownItem,
                                            purpose === item && styles.purposeDropdownItemSelected
                                        ]}
                                        onPress={() => {
                                            setPurpose(item);
                                            setPurposeDropdownVisible(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.purposeDropdownItemText,
                                            purpose === item && styles.purposeDropdownItemTextSelected
                                        ]}>
                                            {item}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </KeyboardAvoidingView>

                        </View>
                    </TouchableOpacity>
                </Modal>
            </View>
        );
    };

    const renderBookingModal = () => {        
        // Updated booking handler with error handling
        const handleBooking = async () => {
            // Validate required fields
            if (!selectedDate || !selectedTime || !purpose) {
                setBookingError('Please fill in all required fields: date, time, and purpose.');
                return;
            }
            
            setIsLoading(true);
            setBookingError(null);
            
            try {
                const response = await bookAppointment({
                    doctorId: selectedDoctor?.id,
                    email: selectedDoctor?.email,
                    date: selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : '',
                    method: "online",
                    status: "pending",
                    time: selectedTime,
                    purpose: purpose,
                    details: details
                });
        
                setIsLoading(false);
        
                // Ensure response is valid
                if (!response) {
                    throw new Error('No response from server. Please try again.');
                }
        
                // Handle success
                if (response.success) {
                    setBookingSuccess(true);
        
                    if (Platform.OS === 'web') {
                        setTimeout(() => {
                            setBookingModalVisible(false);
                            router.push('/appointments');
                        }, 2000);
                    }
                } else {     
                    // Ensure state updates trigger a re-render
                    setBookingError(response.message || 'Unable to book appointment. Please try again.');
                }
            } catch (error) {
                setIsLoading(false);
        
                const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
                   
                setBookingError(errorMessage);
            }
        };

        return (
            <Modal
                visible={bookingModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setBookingModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <LinearGradient
                        colors={['#ffffff', '#f8faff']}
                        style={[
                            styles.modalContent,
                            isMobileWeb && styles.mobileWebModalContent
                        ]}
                    >
                        <View style={styles.modalHandle} />
                        <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                        style={{ flex: 1 }}
                        >
                        <ScrollView 
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={isMobileWeb && styles.mobileWebScrollContent}
                        >
                            <View style={styles.modalHeader}>
                                <TouchableOpacity 
                                    onPress={() => setBookingModalVisible(false)}
                                    style={styles.backButton}
                                >
                                    <Ionicons name="arrow-back" size={22} color="#1a1f36" />
                                </TouchableOpacity>
                                <Text style={styles.modalTitle}>Book Appointment</Text>
                                <View style={styles.modalHeaderSpacer} />
                            </View>
    
                            {bookingSuccess ? (
                                <View style={styles.successContainer}>
                                    <Ionicons name="checkmark-circle" size={60} color="#10b981" />
                                    <Text style={styles.successTitle}>Appointment Booked!</Text>
                                    <Text style={styles.successText}>
                                        Your appointment with Dr. {selectedDoctor?.name} has been confirmed
                                        for {selectedDate ? format(new Date(selectedDate), 'MMMM dd, yyyy') : ''} at {selectedTime}.
                                    </Text>
                                    {Platform.OS !== 'web' && (
                                        <TouchableOpacity 
                                            style={styles.successButton}
                                            onPress={() => {setBookingModalVisible(false); resetBookingForm();}}
                                        >
                                            <Text style={styles.successButtonText}>Done</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ) : (
                                <>
                                    {/* Error message display */}
                                    {bookingError && (
                                        <View style={styles.errorContainer}>
                                            <Ionicons name="alert-circle" size={24} color="#ef4444" />
                                            <Text style={styles.errorText}>{bookingError}</Text>
                                        </View>
                                    )}
    
                                    <View style={styles.doctorInfoCard}>
                                        <LinearGradient
                                            colors={['#e0f2fe', '#f1f5f9']}
                                            style={styles.doctorInfoGradient}
                                        >
                                            <Image
                                                source={{ uri: selectedDoctor?.image_url }}
                                                style={styles.modalDoctorImage}
                                            />
                                            <View style={styles.modalDoctorInfo}>
                                                <Text style={styles.modalDoctorName}>{selectedDoctor?.name}</Text>
                                                <Text style={styles.modalDoctorSpecialty}>{selectedDoctor?.specialization}</Text>
                                                <View style={styles.modalDoctorStats}>
                                                    <View style={styles.statDivider} />
                                                    <Text style={styles.statText}>🏥 {selectedDoctor?.affiliation}</Text>
                                                </View>
                                            </View>
                                        </LinearGradient>
                                    </View>
    
                                    <View style={styles.inputSection}>
                                        <Text style={styles.sectionTitle}>Select Date & Time</Text>
                                        
                                        <DateTimePicker
                                            consultationHours={selectedDoctor?.consultation_hours || []}
                                            onDateSelect={setSelectedDate}
                                            onTimeSelect={setSelectedTime}
                                            selectedDate={selectedDate}
                                            selectedTime={selectedTime}
                                        />
    
                                        <View style={styles.formSection}>
                                            <Text style={styles.sectionTitle}>Appointment Details</Text>
                                            
                                            {renderPurposeDropdown()}

                                            <View style={{ zIndex: 1000 }}>
                                                <SymptomSelector
                                                    onSelectionChange={setSelectedSymptoms}
                                                    testMode={true}
                                                />
                                            </View>
                                            <View style={styles.inputGroup}>
                                                <Text style={styles.inputLabel}>Additional Details</Text>
                                                <TextInput
                                                    style={[styles.textInput, styles.textAreaInput]}
                                                    value={details}
                                                    onChangeText={setDetails}
                                                    placeholder="Describe your symptoms or concerns"
                                                    placeholderTextColor="#a0aec0"
                                                    multiline
                                                    numberOfLines={4}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                </>
                            )}
                        </ScrollView>
                        </KeyboardAvoidingView>

    
                        {!bookingSuccess && (
                            <View style={styles.modalFooter}>
                                <TouchableOpacity
                                style={[
                                    styles.cancelButton,
                                    cancelButtonPressed ? styles.cancelButtonActive : null,
                                    isBookingDisabled ? styles.cancelButtonInactive : null
                                ]}
                                onPress={() => setBookingModalVisible(false)}
                                onPressIn={() => setCancelButtonPressed(true)}
                                onPressOut={() => setCancelButtonPressed(false)}
                                disabled={isBookingDisabled}
                                >
                                <Text style={[
                                    styles.cancelButtonText,
                                    cancelButtonPressed ? styles.cancelButtonTextActive : null,
                                    isBookingDisabled ? styles.cancelButtonTextInactive : null
                                ]}>
                                    Cancel
                                </Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                style={[
                                    styles.bookingButton, 
                                    isLoading && styles.bookingButtonDisabled
                                ]}
                                onPress={handleBooking}
                                disabled={isLoading || isBookingDisabled}
                                >
                                <Text style={styles.bookingButtonText}>
                                    {isLoading ? 'Booking...' : 'Confirm'}
                                </Text>
                                </TouchableOpacity>
                            </View>
                            )}
                    </LinearGradient>
                </View>
            </Modal>
        );
    };

    const renderHeader = () => (
        <LinearGradient 
            colors={['#002244', '#0056A3']} 
            style={styles.headerGradient}
        >
            <View style={styles.headerContainer}>
                <View style={styles.headerTextContainer}> 
                    <Text style={styles.headerTitle}>Find your Doctor</Text>
                </View>
                <TouchableOpacity 
                    style={styles.headerIconButton}
                    onPress={() => router.push('/(tabs)/')}
                >
                    <Ionicons name="home" size={24} color="white" />
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );

    const renderEmptyState = () => (
      <View style={styles.emptyState}>
        <LottieView
          source={require('../../assets/animations/empty-search.json')}
          autoPlay
          loop
          style={styles.emptyStateAnimation}
        />
        <Text style={styles.emptyStateTitle}>No doctors found</Text>
        <Text style={styles.emptyStateText}>
          We couldn't find any doctors matching your criteria
        </Text>
        <View style={styles.emptyStateSuggestions}>
          <Text style={styles.emptyStateSuggestionsTitle}>Try:</Text>
          <View style={styles.suggestionRow}>
            <Ionicons name="search-outline" size={18} color="#3b82f6" style={styles.suggestionIcon} />
            <Text style={styles.suggestionText}>Adjusting your search terms</Text>
          </View>
          <View style={styles.suggestionRow}>
            <Ionicons name="filter-outline" size={18} color="#3b82f6" style={styles.suggestionIcon} />
            <Text style={styles.suggestionText}>Changing category filters</Text>
          </View>
          <View style={styles.suggestionRow}>
            <Ionicons name="refresh-outline" size={18} color="#3b82f6" style={styles.suggestionIcon} />
            <Text style={styles.suggestionText}>Clearing all filters</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => {
            setSearchQuery('');
            setActiveCategory('All');
          }}
        >
          <Text style={styles.resetButtonText}>Reset Filters</Text>
        </TouchableOpacity>
      </View>
    );

    const renderDoctor = ({ item }) => {
      const getNextAvailableSlot = () => {
          if (!item.consultation_hours || !item.consultation_hours.length) return null;
          
          const today = new Date();
          const dayName = format(today, 'EEEE');
          
          const todaySlots = item.consultation_hours
              .filter(slot => slot.day === dayName)
              .flatMap(slot => slot.hours)
              .sort((a, b) => a.start_time.localeCompare(b.start_time));
  
          if (todaySlots.length > 0) {
              return {
                  day: dayName,
                  time: format(parseISO(`2000-01-01T${todaySlots[0].start_time}`), 'h:mm a')
              };
          }
  
          // If no slots today, get the next available day
          if (item.consultation_hours.length > 0 && item.consultation_hours[0].hours && item.consultation_hours[0].hours.length > 0) {
              const nextSlot = item.consultation_hours[0];
              return {
                  day: nextSlot.day,
                  time: format(parseISO(`2000-01-01T${nextSlot.hours[0].start_time}`), 'h:mm a')
              };
          }
          
          return null;
      };    
      const nextSlot = getNextAvailableSlot();
  
      return (
          <TouchableOpacity 
            style={[
              styles.doctorCard,
              item.verified ? styles.verifiedDoctorCard : styles.unverifiedDoctorCard,
              isWeb && !isMobileWeb && styles.webDoctorCard,
              isMobileWeb && styles.mobileWebDoctorCard
            ]}
            onPress={() => handleBookNowPress(item)}
            disabled={!item.verified || !nextSlot} // Disable booking for unverified doctors or no availability
          >
            <View style={styles.doctorCardContent}>
              <View style={styles.doctorImageWrapper}>
                <Image source={{ uri: item.image_url }} style={styles.doctorImage} />
                <VerificationBadge verified={item.verified} />
              </View>
              
              <View style={styles.doctorInfo}>
                <View style={styles.doctorNameRow}>
                  <Text style={styles.doctorName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
                </View>
                
                {/* Rest of the component remains the same */}
                <Text style={styles.doctorSpecialty} numberOfLines={1} ellipsizeMode="tail">{item.specialization}</Text>
                
                <View style={styles.doctorStats}>
                  <View style={styles.statDivider} />
                  <Text style={styles.statText} numberOfLines={1} ellipsizeMode="tail">🏥 {item.affiliation}</Text>
                </View>
                
                <Text style={styles.feeText}>💰 Consultation Fee: Ksh {item.consultation_fee}</Text>
                
                {item.verified && nextSlot ? (
                  <View style={styles.availabilityTag}>
                    <Ionicons name="time-outline" size={14} color="#3b82f6" />
                    <Text style={styles.availabilityText}>
                      Available: {nextSlot.day}, {nextSlot.time}
                    </Text>
                  </View>
                ) : item.verified ? (
                  <View style={styles.unavailabilityTag}>
                    <Ionicons name="calendar-outline" size={14} color="#ef4444" />
                    <Text style={styles.unavailabilityText}>
                      No available slots
                    </Text>
                  </View>
                ) : (
                  <View style={styles.unverifiedWarning}>
                    <Ionicons name="information-circle-outline" size={14} color="#f59e0b" />
                    <Text style={styles.unverifiedWarningText}>
                      Profile pending verification
                    </Text>
                  </View>
                )}
              </View>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.bookButton,
                item.verified && nextSlot ? styles.activeBookButton : styles.disabledBookButton
              ]}
              onPress={() => handleBookNowPress(item)}
              disabled={!item.verified || !nextSlot}
            >
              <Text style={[
                styles.bookButtonText,
                item.verified && nextSlot ? styles.activeBookButtonText : styles.disabledBookButtonText
              ]}>
                {!item.verified ? "Unavailable" : nextSlot ? "Book Now" : "No Available Slots"}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
      );
  };

    const renderVerificationDropdown = () => {
        return (
          <View style={styles.verificationFilterContainer}>
            <Text style={styles.filterLabel}>Doctor Verification</Text>
            <TouchableOpacity 
              ref={verificationButtonRef}
              style={[
                styles.filterButton,
                verificationFilter !== 'All' && styles.activeFilterButton
              ]}
              onPress={openVerificationDropdown}
            >
              <View style={styles.dropdownButtonContent}>
                {verificationFilter === 'Verified Only' && (
                  <Ionicons name="shield-checkmark" size={16} color="#10b981" style={styles.filterIcon} />
                )}
                {verificationFilter === 'Unverified' && (
                  <Ionicons name="alert-circle" size={16} color="#f59e0b" style={styles.filterIcon} />
                )}
                <Text style={[
                  styles.dropdownButtonText,
                  verificationFilter !== 'All' && styles.activeFilterText
                ]}>
                  {verificationFilter}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#64748b" />
              </View>
            </TouchableOpacity>
            
            <Modal
              visible={verificationDropdownVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setVerificationDropdownVisible(false)}
            >
              <TouchableOpacity 
                style={styles.dropdownOverlay}
                activeOpacity={1}
                onPress={() => setVerificationDropdownVisible(false)}
              >
                <View 
                  style={[
                    styles.verificationDropdownContainer,
                    {
                      top: verificationButtonLayout.y + verificationButtonLayout.height + 5,
                      left: verificationButtonLayout.x,
                      width: verificationButtonLayout.width,
                    }
                  ]}
                >
                  <ScrollView style={styles.dropdownScroll}>
                    {verificationOptions.map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.dropdownItem,
                          verificationFilter === option.name && styles.dropdownItemSelected
                        ]}
                        onPress={() => handleVerificationFilterChange(option.name)}
                      >
                        {option.id === 'verified' && (
                          <Ionicons name="shield-checkmark" size={18} color="#10b981" style={styles.optionIcon} />
                        )}
                        {option.id === 'unverified' && (
                          <Ionicons name="alert-circle" size={18} color="#f59e0b" style={styles.optionIcon} />
                        )}
                        {option.id === 'all' && (
                          <Ionicons name="people" size={18} color="#64748b" style={styles.optionIcon} />
                        )}
                        <Text style={[
                          styles.dropdownItemText,
                          verificationFilter === option.name && styles.dropdownItemTextSelected
                        ]}>
                          {option.name}
                        </Text>
                        
                        {option.id !== 'all' && (
                          <View style={styles.tooltipContainer}>
                            <Ionicons name="information-circle-outline" size={16} color="#64748b" />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  
                  <View style={styles.filterFooter}>
                    <Text style={styles.filterFooterText}>
                      Only verified doctors can be booked for appointments
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Modal>
          </View>
        );
      };
    
    const renderVerificationInfo = () => (
    <TouchableOpacity 
        style={styles.infoButton}
        onPress={() => {
        Alert.alert(
            "Doctor Verification",
            "Verified doctors have completed our credential verification process. Only verified doctors can be booked for appointments. Unverified doctors are still completing this process.",
            [{ text: "Got it" }]
        );
        }}
    >
        <Ionicons name="information-circle-outline" size={22} color="#64748b" />
    </TouchableOpacity>
    );

    const renderLoadingState = () => {
        return (
            <View style={styles.loadingContainer}>
                <LottieView
                    source={require('../../assets/animations/doctor-loading.json')}
                    autoPlay
                    loop
                    style={styles.loadingAnimation}
                />
                
                <Text style={styles.loadingTitle}>Finding the best doctors for you</Text>
                
                <View style={styles.loadingProgressContainer}>
                    <View style={styles.loadingBarBackground}>
                        <Animated.View 
                            style={[
                                styles.loadingBarFill, 
                                { 
                                    width: animatedLoadingValue.interpolate({
                                        inputRange: [0, 100],
                                        outputRange: ['0%', '100%']
                                    }) 
                                }
                            ]} 
                        />
                    </View>
                    <Text style={styles.loadingPercentage}>{Math.round(loadingProgress)}%</Text>
                </View>
                
                <View style={styles.loadingMessages}>
                    <Text style={styles.loadingMessageText}>
                        {loadingProgress < 30 ? "Searching for healthcare providers..." : 
                         loadingProgress < 60 ? "Verifying doctor credentials..." : 
                         loadingProgress < 90 ? "Checking appointment availability..." : 
                         "Almost ready!"}
                    </Text>
                </View>
            </View>
        );
    };

    const renderSearchAndFilters = () => {
        return (
            <View style={styles.searchAndFiltersContainer}>
                <Searchbar
                  placeholder="Search specialists, symptoms..."
                  placeholderTextColor={styles.searchBarPlaceholderTextColor}
                  onChangeText={handleSearch}
                  value={searchQuery}
                  style={styles.searchBar}
                  inputStyle={styles.searchInput}
                  icon={() => <Ionicons name="search-outline" size={20} color="#64748b" />}
                  clearIcon={() => searchQuery ?
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close" size={20} color="#64748b" />
                    </TouchableOpacity> : null
                  }
                />
                {/* Add the wrapper with correct z-indexing */}
                <View style={styles.specializationFilterWrapper}>
                    <SpecializationFilter 
                        specializations={specializations}
                        activeCategory={activeCategory}
                        onCategoryPress={handleCategoryPress}
                        isLoading={isLoading}
                    />
                </View>
            </View>
        );
    };

    // Calculate the number of columns based on screen width
    const getNumColumns = () => {
        if (!isWeb) return 1;
        if (width < 768) return 1; // Mobile web
        if (width < 1200) return 2; // Tablet
        return Math.floor(width / 400); // Desktop
    };

    const numColumns = getNumColumns();

    // Add pull to refresh UI feedback component
    const renderRefreshHeader = () => {
        if (isWeb) return null; // Only show on mobile
        
        return (
            <View style={styles.refreshHeaderContainer}>
                {refreshing && (
                    <View style={styles.refreshingIndicator}>
                        <ActivityIndicator size="small" color="#0056A3" />
                        <Text style={styles.refreshingText}>Refreshing...</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <PaperProvider>
            <SafeAreaView style={styles.safeArea}>
                <StatusBar barStyle="light-content" backgroundColor="#002244" />
                
                {renderHeader()}
                
                <View style={styles.container}>
                    {!isLoading && renderSearchAndFilters()}
                    
                    {/* Set a lower z-index for the FlatList container */}
                    <View style={[
                        { flex: 1 },
                        !isWeb && { zIndex: 1, elevation: 1 } // only apply on native
                    ]}>
                        {isLoading ? (
                            renderLoadingState()
                        ) : (
                            <>
                                {renderRefreshHeader()}
                                <FlatList
                                    data={filteredDoctors}
                                    renderItem={renderDoctor}
                                    keyExtractor={item => item.email || item.id?.toString() || Math.random().toString()}
                                    contentContainerStyle={[
                                        styles.listContainer,
                                        isWeb && !isMobileWeb && styles.webListContainer,
                                        filteredDoctors.length === 0 && styles.emptyListContainer
                                    ]}
                                    ListEmptyComponent={renderEmptyState}
                                    showsVerticalScrollIndicator={false}
                                    numColumns={numColumns}
                                    key={`doctors-list-${numColumns}`}
                                    columnWrapperStyle={isWeb && numColumns > 1 ? styles.columnWrapper : undefined}
                                    // Add pull to refresh functionality
                                    refreshControl={
                                        <RefreshControl
                                            refreshing={refreshing}
                                            onRefresh={onRefresh}
                                            colors={['#0056A3']}
                                            tintColor="#0056A3"
                                            title="Refreshing doctors list..."
                                            titleColor="#64748b"
                                        />
                                    }
                                />
                            </>
                        )}
                    </View>
                    
                    {renderBookingModal()}
                </View>
            </SafeAreaView>
        </PaperProvider>
    );
};

const styles = StyleSheet.create({
  // Container and layout styles
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollViewContainer: {
    flexGrow: 1,
  },
  refreshHeaderContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    },
    refreshingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    refreshingText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#64748b',
    },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    minHeight: '100%',
  },
  webListContainer: {
    paddingHorizontal: 24,
    alignItems: 'stretch',
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
    width: '100%',
  },
  
  // Header styles
  headerGradient: {
    paddingTop: 40,
    paddingBottom: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerIconButton: {
    padding: 8,
  },
  
  searchAndFiltersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#f1f5f9', // Slightly darker background for better contrast
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 12,
    zIndex: 10,
  },
  searchBar: {
    elevation: 4, // Increased elevation for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    fontSize: 16,
    paddingHorizontal: 12,
    color: '#334155', // Darker text for better readability
    fontWeight: '400',
    searchBarPlaceholderTextColor: '#64748b', // Darker placeholder color for better visibility
  },
  specializationFilterWrapper: {
    zIndex: 5,
    elevation: 5,
    marginBottom: 8,
  },
  
  // Doctor card styles
  doctorCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginVertical: 10,
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
    flex: 1,
    maxWidth: '100%',
    margin: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  doctorCardContent: {
    padding: 16,
    flexDirection: 'row',
  },
  doctorImageContainer: {
    position: 'relative',
    marginRight: 14,
  },
  doctorImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  mobileWebDoctorCard: {
    marginHorizontal: 0,
  },
  doctorInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  doctorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start', // Changed from space-between to flex-start
    marginBottom: 4,
    flexWrap: 'wrap', // Allow wrapping if needed
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
    flex: 1, // Take available space but allow badge to show
  },
  doctorSpecialty: {
    fontSize: 14,
    color: '#0284c7',
    fontWeight: '500',
    marginBottom: 8,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  doctorStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statDivider: {
    width: 0,
    height: 0,
  },
  statText: {
    fontSize: 14,
    color: '#64748b',
  },
  feeText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
    marginBottom: 10,
  },
  availabilityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  availabilityText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#10b981',
    fontWeight: '500',
  },
  unavailabilityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  unavailabilityText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '500',
  },
  bookButton: {
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  activeBookButton: {
    backgroundColor: 'transparent',
  },
  disabledBookButton: {
    backgroundColor: 'transparent',
  },
  bookButtonText: {
    fontSize: 14, // Smaller font size
    fontWeight: '600',
  },
  activeBookButtonText: {
    color: '#3b82f6',
  },
  disabledBookButtonText: {
    color: '#94a3b8',
  },
  // Moved verification badge to bottom of image
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  unverifiedBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  verificationText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 3,
  },
  verifiedText: {
    color: '#10b981',
  },
  unverifiedText: {
    color: '#f59e0b',
  },
  // Appointment info
  appointmentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  nextSlotContainer: {
    flex: 1,
  },
  nextSlotLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  nextSlotTime: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  bookButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  bookButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    width: '100%',
    maxWidth: 500, // Prevents excessive width on larger screens
    alignSelf: 'center',
  },
  emptyStateAnimation: {
    width: 150,
    height: 150, // Fixed dimensions to prevent unpredictable scaling
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  emptyStateSuggestions: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyStateSuggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    fontSize: 14,
    color: '#334155',
    flex: 1, // Ensures text takes available space
  },
  resetButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '80%', // More contained button width
    alignItems: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingAnimation: {
    width: 200,
    height: 200,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 24,
    textAlign: 'center',
  },
  loadingProgressContainer: {
    width: '100%',
    maxWidth: 300,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  loadingBarFill: {
    height: '100%',
    backgroundColor: '#0284c7',
  },
  loadingPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    width: 40,
    textAlign: 'right',
  },
  loadingMessages: {
    marginTop: 16,
  },
  loadingMessageText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 0,
    paddingBottom: 0,
    height: '90%',
    width: '100%',
    alignSelf: 'center',
  },
  mobileWebModalContent: {
    height: '90%',
    width: '100%',
  },
  mobileWebScrollContent: {
    paddingHorizontal: 16,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#cbd5e1',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  modalHeaderSpacer: {
    width: 28,
  },
  doctorInfoCard: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  doctorInfoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  modalDoctorImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e2e8f0',
  },
  modalDoctorInfo: {
    marginLeft: 16,
    flex: 1,
  },
  modalDoctorName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  modalDoctorSpecialty: {
    fontSize: 16,
    color: '#334155',
    marginBottom: 8,
  },
  modalDoctorStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: '#64748b',
  },
  statDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 8,
  },
  
  // Form sections
  inputSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  formSection: {
    marginTop: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  textAreaInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  
  // Dropdown styles
  dropdownButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownButtonText: {
    fontSize: 15,
    color: '#0f172a',
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: '#94a3b8',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  purposeDropdownContainer: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    maxHeight: 200,
  },
  purposeDropdownScroll: {
    maxHeight: 200,
  },
  purposeDropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  purposeDropdownItemSelected: {
    backgroundColor: '#f0f9ff',
  },
  purposeDropdownItemText: {
    fontSize: 15,
    color: '#334155',
  },
  purposeDropdownItemTextSelected: {
    color: '#0284c7',
    fontWeight: '500',
  },
  
  // Modal footer styles with equal-sized buttons and improved cancel button
modalFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    padding: 16,
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2', // Light red background
    borderWidth: 1,
    borderColor: '#fecaca', // Slightly darker red border
    borderRadius: 8,
    marginRight: 12,
  },
  cancelButtonActive: {
    backgroundColor: '#ef4444', // Deep red when active/pressed
    borderColor: '#dc2626',
  },
  cancelButtonInactive: {
    backgroundColor: '#fecaca', // Faded red when inactive
    borderColor: '#fee2e2',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#b91c1c', // Dark red text
  },
  cancelButtonTextActive: {
    color: 'white', // White text when button is active
  },
  cancelButtonTextInactive: {
    color: '#ef4444', // Lighter red text when inactive
  },
  bookingButton: {
    flex: 1, // Changed from flex: 2 to make buttons equal size
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  bookingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  
  // Success state
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
  },
  successText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  successButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  
  // Error state
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  errorText: {
    color: '#b91c1c',
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
    dateTimePickerContainer: {
    width: '100%',
    marginVertical: 15,
    },

    // Date picker button
    datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 12,
    },
    datePickerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    },
    datePickerButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#334155',
    },

    // Time picker button
    timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8fafc',
    },
    timePickerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    },
    timePickerButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#334155',
    },

    // Calendar modal
    calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    },
    calendarModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 360,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    },
    calendar: {
    padding: 15,
    },
    calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 5,
    },
    calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    },
    calendarNavButton: {
    padding: 5,
    },
    calendarGrid: {},
    calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    },
    calendarHeaderCell: {
    flex: 1,
    alignItems: 'center',
    },
    calendarHeaderText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    },
    calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    },
    calendarDay: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    margin: 2,
    },
    calendarDaySelected: {
    backgroundColor: '#3b82f6',
    },
    calendarDayDisabled: {
    opacity: 0.4,
    },
    calendarDayToday: {
    borderWidth: 1,
    borderColor: '#3b82f6',
    },
    calendarDayOtherMonth: {
    opacity: 0.3,
    },
    calendarDayText: {
    fontSize: 14,
    color: '#334155',
    },
    calendarDayTextSelected: {
    color: 'white',
    fontWeight: '600',
    },
    calendarDayTextToday: {
    color: '#3b82f6',
    fontWeight: '600',
    },
    calendarDayTextDisabled: {
    color: '#94a3b8',
    },
    calendarDayTextOtherMonth: {
    color: '#94a3b8',
    },
    calendarFooter: {
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    padding: 15,
    alignItems: 'flex-end',
    },
    calendarCancelButton: {
    padding: 8,
    },
    calendarCancelButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
    },

    // Time dropdown
    dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    },
    timeDropdownContainer: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 8,
    maxHeight: 250,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    },
    timeDropdownScroll: {
    maxHeight: 250,
    },
    timeDropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    },
    timeDropdownItemSelected: {
    backgroundColor: '#eff6ff',
    },
    timeDropdownItemText: {
    fontSize: 16,
    color: '#334155',
    },
    timeDropdownItemTextSelected: {
    color: '#3b82f6',
    fontWeight: '500',
    },
    noTimeSlotsContainer: {
    padding: 16,
    alignItems: 'center',
    },
    noTimeSlotsText: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
    },
    verificationBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    verifiedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    unverifiedBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    verificationText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    },
    verifiedText: {
    color: '#10b981',
    },
    unverifiedText: {
    color: '#f59e0b',
    },
    
    // Doctor card styles
    verifiedDoctorCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    },
    unverifiedDoctorCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    backgroundColor: '#fffbeb',
    },
    
    unverifiedWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
    },
    unverifiedWarningText: {
    color: '#d97706',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    },
    
    // Button styles
    activeBookButton: {
    backgroundColor: '#3b82f6',
    },
    disabledBookButton: {
    backgroundColor: '#e5e7eb',
    },
    activeBookButtonText: {
    color: '#ffffff',
    },
    disabledBookButtonText: {
    color: '#9ca3af',
    },
    
    // Filter styles
    activeFilterButton: {
    backgroundColor: '#f0f9ff',
    borderColor: '#93c5fd',
    },
    activeFilterText: {
    color: '#3b82f6',
    fontWeight: '600',
    },
    filterIcon: {
    marginRight: 6,
    },
    optionIcon: {
    marginRight: 8,
    },
    tooltipContainer: {
    marginLeft: 'auto',
    },
    filterFooter: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    },
    filterFooterText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    },
    
    // Info button
    infoButton: {
    padding: 8,
    marginLeft: 8,
    },
    doctorImageWrapper: {
    marginRight: 14,
    alignItems: 'center',
  },
  doctorImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    marginBottom: 4, // Add space between image and badge
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2, // Space between image and badge
    width: 80, // Fixed width for the badge
    justifyContent: 'center',
  },
  verifiedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  unverifiedBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  verificationText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  verifiedText: {
    color: '#10b981',
  },
  unverifiedText: {
    color: '#f59e0b',
  },
});
export default  DoctorListing;