import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    ScrollView, 
    StyleSheet, 
    Dimensions, 
    Animated, 
    Platform,
    ActivityIndicator,
    Image,
    Modal,
    Alert
} from 'react-native';
import { Feather, MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { useRouter } from 'expo-router';
import tw from "tailwind-react-native-classnames";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SharedElement } from 'react-navigation-shared-element';
import { getMedicalReports } from '../../services/medicalReportsService';
import * as jwt_decode from "jwt-decode";
import { TextInput } from 'react-native';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = Platform.OS === 'ios' ? 150 : 130;

const PatientReportsScreen = () => {
    const router = useRouter();
    const [selectedReport, setSelectedReport] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const scrollY = useRef(new Animated.Value(0)).current;
    const [user, setUser] = useState({ name: '' });
    const [token, setToken] = useState(null);
    const [imageUri, setImageUri] = useState(null);
    const [reports, setReports] = useState([]);
    const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest', 'a-z'
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchActive, setIsSearchActive] = useState(false);

    // Report icons mapping
    const reportIcons = {
        'lab': 'flask-outline',
        'imaging': 'scan-outline',
        'diagnosis': 'document-text-outline',
        'general': 'medical-outline'
    };

    // Header animations
    const headerOpacity = scrollY.interpolate({
        inputRange: [0, HEADER_HEIGHT * 0.5, HEADER_HEIGHT],
        outputRange: [1, 0.8, 0.6],
        extrapolate: 'clamp',
    });

    const headerTranslateY = scrollY.interpolate({
        inputRange: [0, HEADER_HEIGHT],
        outputRange: [0, -HEADER_HEIGHT / 3],
        extrapolate: 'clamp',
    });

    // Format date helper
    const formatDate = (dateString) => {
        if (!dateString) return 'No date';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    };

    // Get filtered and sorted reports
    const filteredAndSortedReports = useMemo(() => {
        let filtered = [...reports];
        
        // Apply search filter if active
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(report => 
                (report.title && report.title.toLowerCase().includes(query)) ||
                (report.doctor_name && report.doctor_name.toLowerCase().includes(query)) ||
                (report.diagnosis && report.diagnosis.toLowerCase().includes(query)) ||
                (report.appointment_purpose && report.appointment_purpose.toLowerCase().includes(query))
            );
        }
        
        // Apply sorting
        switch(sortOrder) {
            case 'newest':
                return filtered.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
            case 'oldest':
                return filtered.sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));
            case 'a-z':
                return filtered.sort((a, b) => {
                    const titleA = a.title || `Medical Report - ${a.diagnosis || 'Checkup'}`;
                    const titleB = b.title || `Medical Report - ${b.diagnosis || 'Checkup'}`;
                    return titleA.localeCompare(titleB);
                });
            default:
                return filtered;
        }
    }, [reports, sortOrder, searchQuery]);
    

    // Validate token and redirect if invalid
    useEffect(() => {
        const checkToken = async () => {
            try {
                const token = await AsyncStorage.getItem("token");
                if (token) {
                    try {
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

    // Fetch user data and reports
    useEffect(() => {
        const fetchUserData = async () => {
            setIsLoading(true);
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

                    // Fetch reports data
                    const fetchedReports = await getMedicalReports(parsedUser.email);
                    
                    // Add categories to reports for demo purposes
                    const reportsWithCategories = fetchedReports.map((report, index) => {
                        const categories = ['lab', 'imaging', 'diagnosis', 'general'];
                        return {
                            ...report, 
                            category: categories[index % categories.length]
                        };
                    });
                    
                    setReports(reportsWithCategories);
                }
            } catch (error) {
                console.error("Error retrieving user info:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, []);

    // Components
    const EmptyState = ({ setSearchQuery }) => {
        // Add error handling for the Lottie animation
        const [animationError, setAnimationError] = useState(false);
        
        return (
          <View style={styles.emptyState}>
            <View style={styles.contentContainer}>
              {!animationError ? (
                <View style={styles.animationContainer}>
                  <LottieView
                    source={require('../../assets/animations/empty-search.json')}
                    autoPlay
                    loop
                    style={styles.animation}
                    onError={() => setAnimationError(true)}
                    // Add hardcoded dimensions as backup
                    resizeMode="contain"
                  />
                </View>
              ) : (
                // Fallback when animation fails
                <View style={styles.animationContainer}>
                  <Ionicons name="search-outline" size={80} color="#3b82f6" />
                </View>
              )}
              
              <Text style={styles.title}>No reports found</Text>
              
              <Text style={styles.subtitle}>
                We couldn't find any reports matching your criteria
              </Text>
              
              <View style={styles.suggestionsCard}>
                <Text style={styles.suggestionsTitle}>Try:</Text>
                
                <View style={styles.suggestionsList}>
                  <View style={styles.suggestionItem}>
                    <Ionicons name="search-outline" size={18} color="#3b82f6" style={styles.suggestionIcon} />
                    <Text style={styles.suggestionText}>Adjusting your search terms</Text>
                  </View>
                  
                  <View style={styles.suggestionItem}>
                    <Ionicons name="refresh-outline" size={18} color="#3b82f6" style={styles.suggestionIcon} />
                    <Text style={styles.suggestionText}>Clearing all filters</Text>
                  </View>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setSearchQuery('');
                }}
              >
                <Text style={styles.resetButtonText}>Reset Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
    };

    const SearchBar = () => (
        <Animated.View 
            style={[
                styles.searchContainer,
                { 
                    height: isSearchActive ? 60 : 0,
                    opacity: isSearchActive ? 1 : 0
                }
            ]}
        >
            <View style={styles.searchInputContainer}>
                <Feather name="search" size={18} color="#6B7280" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search reports..."
                    placeholderTextColor="#9CA3AF"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus={isSearchActive}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Feather name="x" size={18} color="#6B7280" />
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );

    const FilterHeader = () => (
        <View style={styles.filterHeaderContainer}>
            <View style={styles.filterHeaderLeft}>
                <Text style={styles.filterResultText}>
                    {filteredAndSortedReports.length} {filteredAndSortedReports.length === 1 ? 'report' : 'reports'} found
                </Text>
            </View>
            <View style={styles.filterHeaderRight}>
                <TouchableOpacity 
                    style={styles.headerActionButton}
                    onPress={() => setIsSearchActive(!isSearchActive)}
                >
                    <Feather name="search" size={20} color="#4B5563" />
                </TouchableOpacity>
                <View style={styles.sortDropdownContainer}>
                    <TouchableOpacity 
                        style={styles.sortDropdown}
                        onPress={() => {
                            // In a real app, you'd show a dropdown here
                            // For now, we'll just cycle through the options
                            const nextSortOrder = {
                                'newest': 'oldest',
                                'oldest': 'a-z',
                                'a-z': 'newest'
                            };
                            setSortOrder(nextSortOrder[sortOrder]);
                        }}
                    >
                        <Text style={styles.sortText}>
                            Sort: {sortOrder === 'newest' ? 'Newest' : sortOrder === 'oldest' ? 'Oldest' : 'A-Z'}
                        </Text>
                        <Feather name="chevron-down" size={16} color="#4B5563" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    // Update the ReportCard component for better styling
    const ReportCard = ({ report, index }) => {
        const cardScale = useRef(new Animated.Value(1)).current;
        
        const animatePress = () => {
            Animated.sequence([
                Animated.timing(cardScale, {
                    toValue: 0.97,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(cardScale, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                })
            ]).start();
            
            setSelectedReport(report);
            setIsModalVisible(true);
        };

        const iconName = reportIcons[report.category] || reportIcons.general;
        const getGradientColors = () => {
            const colorSets = {
                'lab': ['#3B82F6', '#1E40AF'],
                'imaging': ['#8B5CF6', '#5B21B6'],
                'diagnosis': ['#10B981', '#047857'],
                'general': ['#F59E0B', '#B45309']
            };
            return colorSets[report.category] || colorSets.general;
        };

        return (
            <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{
                    type: 'timing',
                    duration: 400,
                    delay: index * 80, 
                }}
                style={styles.cardWrapper}
            >
                <Animated.View 
                    style={[
                        styles.cardContainer,
                        { transform: [{ scale: cardScale }] }
                    ]}
                >
                    <TouchableOpacity
                        onPress={animatePress}
                        activeOpacity={0.9}
                        style={styles.cardTouchable}
                    >
                        <LinearGradient
                            colors={getGradientColors()}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.cardIconContainer}
                        >
                            <Ionicons name={iconName} size={28} color="white" />
                        </LinearGradient>
                        
                        <View style={styles.cardContent}>
                            <View style={styles.cardHeader}>
                                <View style={styles.titleRow}>
                                    <Text style={styles.reportTitle} numberOfLines={1}>
                                        {report.title || `Medical Report - ${report.diagnosis || 'Checkup'}`}
                                    </Text>
                                    <View style={[styles.categoryBadge, getCategoryStyle(report.category)]}>
                                        <Text style={styles.categoryText}>{report.category}</Text>
                                    </View>
                                </View>
                                <Text style={styles.reportDate}>{formatDate(report.appointment_date)}</Text>
                            </View>
                            
                            <View style={styles.cardDetails}>
                                <View style={styles.doctorContainer}>
                                    <Feather name="user" size={14} color="#6B7280" style={styles.detailIcon} />
                                    <Text style={styles.reportDoctor}>Dr. {report.doctor_name || 'Unknown'}</Text>
                                </View>
                                <View style={styles.typeContainer}>
                                    <Feather name="file-text" size={14} color="#6B7280" style={styles.detailIcon} />
                                    <Text style={styles.reportType}>{report.appointment_purpose || 'General checkup'}</Text>
                                </View>
                            </View>
                            
                            <View style={styles.cardFooter}>
                                <TouchableOpacity style={styles.viewMoreButton} onPress={animatePress}>
                                    <Text style={styles.viewMoreText}>View Details</Text>
                                    <Feather name="chevron-right" size={16} color="#4338CA" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            </MotiView>
        );
    };

    // Add this helper function for category styling
    const getCategoryStyle = (category) => {
        const styles = {
            'lab': {
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderColor: 'rgba(59, 130, 246, 0.3)',
            },
            'imaging': {
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderColor: 'rgba(139, 92, 246, 0.3)',
            },
            'diagnosis': {
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderColor: 'rgba(16, 185, 129, 0.3)',
            },
            'general': {
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderColor: 'rgba(245, 158, 11, 0.3)',
            }
        };
        return styles[category] || styles.general;
    };

    // Update the header section
    return (
        <View style={styles.container}>
            {/* Animated Header */}
            <Animated.View style={[
                styles.header,
                {
                    opacity: headerOpacity,
                    transform: [{ translateY: headerTranslateY }]
                }
            ]}>
            <BlurView intensity={90} tint="light" style={styles.headerBlur}>
                <LinearGradient
                    colors={['#1F4690', '#3B82F6']}
                    style={styles.headerGradient}
                >
                    <View style={styles.headerTopRow}>
                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle}>Medical Records</Text>
                            <Text style={styles.headerSubtitle}>{user.name}</Text>
                        </View>
                        
                        <TouchableOpacity 
                            style={styles.homeButton}
                            onPress={() => router.push('/(tabs)/')}
                        >
                            <Ionicons name="home" size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.headerStatsContainer}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{reports.length}</Text>
                            <Text style={styles.statLabel}>Reports</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{filteredAndSortedReports.length}</Text>
                            <Text style={styles.statLabel}>Visible</Text>
                        </View>
                    </View>
                </LinearGradient>
            </BlurView>
        </Animated.View>

     
    </View>
    );

    // Update the modal to replace Share with Download PDF button
    const ReportDetailModal = () => {
        if (!selectedReport) return null;
        
        // Add state for download progress
        const [downloading, setDownloading] = useState(false);
        
        // Function to handle PDF download
        const handleDownloadPDF = () => {
            generatePDF(selectedReport);
        };

        // Add this function in your component
        const generatePDF = async (report) => {
            try {
                setDownloading(true);
                
                // Create the PDF content with HTML
                const htmlContent = `
                    <html>
                        <head>
                            <style>
                                body { font-family: 'Helvetica'; padding: 20px; }
                                h1 { color: #1F2937; font-size: 24px; margin-bottom: 10px; }
                                h2 { color: #4B5563; font-size: 18px; margin-top: 20px; margin-bottom: 10px; }
                                p { color: #6B7280; font-size: 14px; line-height: 1.5; }
                                .header { background-color: #4338CA; color: white; padding: 20px; border-radius: 10px; }
                                .section { margin-top: 20px; border-left: 3px solid #4338CA; padding-left: 15px; background-color: #F9FAFB; padding: 15px; border-radius: 10px; }
                                .medication { padding: 10px; border-bottom: 1px solid #E5E7EB; }
                            </style>
                        </head>
                        <body>
                            <div class="header">
                                <h1>${report.title || `Medical Report - ${report.diagnosis || 'Checkup'}`}</h1>
                                <p>Date: ${formatDate(report.appointment_date)}</p>
                                <p>Doctor: Dr. ${report.doctor_name || 'Unknown'}</p>
                            </div>
                            
                            <h2>Purpose</h2>
                            <p>${report.appointment_purpose || 'General health checkup'}</p>
                            
                            ${report.diagnosis ? `
                                <h2>Diagnosis</h2>
                                <div class="section">
                                    <p>${report.diagnosis}</p>
                                </div>
                            ` : ''}
                            
                            ${report.prescription ? `
                                <h2>Prescription</h2>
                                <div class="section">
                                    ${report.prescription.split(',').map(med => 
                                        `<div class="medication">${med.trim()}</div>`
                                    ).join('')}
                                </div>
                            ` : ''}
                            
                            ${report.recommendations ? `
                                <h2>Recommendations</h2>
                                <p>${report.recommendations}</p>
                            ` : ''}
                        </body>
                    </html>
                `;
                
                // Generate the PDF file
                const options = {
                    html: htmlContent,
                    fileName: `Medical_Report_${formatDate(report.appointment_date).replace(/\//g, '-')}`,
                    directory: 'Documents',
                };
                
                const file = await RNHTMLtoPDF.convert(options);
                
                // Share the PDF file
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(file.filePath);
                } else {
                    Alert.alert(
                        "Download Complete", 
                        `Report saved to: ${file.filePath}`,
                        [{ text: "OK" }]
                    );
                }
            } catch (error) {
                console.error('PDF generation error:', error);
                Alert.alert("Error", "Failed to generate PDF. Please try again.");
            } finally {
                setDownloading(false);
        }
    };

        return (
            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <LinearGradient
                                colors={getCategoryGradient(selectedReport.category)}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.modalHeaderGradient}
                            >
                                <TouchableOpacity 
                                    style={styles.modalCloseButton}
                                    onPress={() => setIsModalVisible(false)}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Feather name="x" size={22} color="white" />
                                </TouchableOpacity>
                                
                                <View style={styles.modalHeaderContent}>
                                    <Text style={styles.modalTitle} numberOfLines={2}>
                                        {selectedReport.title || `Medical Report - ${selectedReport.diagnosis || 'Checkup'}`}
                                    </Text>
                                    
                                    <View style={styles.modalHeaderInfo}>
                                        <View style={styles.modalInfoItem}>
                                            <Feather name="calendar" size={14} color="white" style={styles.modalInfoIcon} />
                                            <Text style={styles.modalInfoText}>{formatDate(selectedReport.appointment_date)}</Text>
                                        </View>
                                        <View style={styles.modalInfoItem}>
                                            <Feather name="user" size={14} color="white" style={styles.modalInfoIcon} />
                                            <Text style={styles.modalInfoText}>Dr. {selectedReport.doctor_name || 'Unknown'}</Text>
                                        </View>
                                    </View>
                                </View>
                            </LinearGradient>
                        </View>
                        
                        {/* Modal Body */}
                        <ScrollView 
                            style={styles.modalBody}
                            contentContainerStyle={styles.modalBodyContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Rest of your existing modal content */}
                            {/* ... */}
                            
                            {/* Add bottom padding to prevent footer overlap */}
                            <View style={{ height: 80 }} />
                        </ScrollView>
                        
                        {/* Modal Footer with Download button */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity 
                                style={styles.downloadButton}
                                onPress={handleDownloadPDF}
                                disabled={downloading}
                            >
                                <LinearGradient
                                    colors={['#4338CA', '#3B82F6']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.downloadButtonGradient}
                                >
                                    {downloading ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <>
                                            <Feather name="download" size={20} color="white" />
                                            <Text style={styles.downloadButtonText}>Download as PDF</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    // Helper function to get category gradient
    const getCategoryGradient = (category) => {
        const gradients = {
            'lab': ['#3B82F6', '#1E40AF'],
            'imaging': ['#8B5CF6', '#5B21B6'],
            'diagnosis': ['#10B981', '#047857'],
            'general': ['#F59E0B', '#B45309']
        };
        return gradients[category] || gradients.general;
    };

    return (
        <View style={styles.container}>
            {/* Animated Header */}
            <Animated.View style={[
                styles.header,
                {
                    opacity: headerOpacity,
                    transform: [{ translateY: headerTranslateY }]
                }
            ]}>
                <BlurView intensity={90} tint="light" style={styles.headerBlur}>
                    <LinearGradient
                        colors={['#1A4D8C', '#3B82F6']}
                        style={styles.headerGradient}
                    >
                        <View style={styles.headerTopRow}>
                            <View style={styles.headerTitleContainer}>
                                <Text style={styles.headerTitle}>Medical Records</Text>
                                <Text style={styles.headerSubtitle}>{user.name}</Text>
                            </View>
                            
                            <TouchableOpacity 
                                style={tw`p-2 rounded-full`}
                                onPress={() => router.push('/(tabs)/')}
                            >
                                <Ionicons name="home" size={24} color="white" />
                            </TouchableOpacity> 
                        </View>
{/*                         
                        <View style={styles.headerStatsContainer}>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{reports.length}</Text>
                                <Text style={styles.statLabel}>Reports</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{reports.length}</Text>
                                <Text style={styles.statLabel}>Visits</Text>
                            </View>
                        </View> */}
                    </LinearGradient>
                </BlurView>
            </Animated.View>

            {/* Main Content */}
            <Animated.ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
            >
                {/* Search Bar (conditionally rendered) */}
                {/* <SearchBar />
                
                {/* Filter Header with Sort & Search 
                <FilterHeader /> */}
                
                {/* Reports List */}
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#4338CA" />
                        <Text style={styles.loadingText}>Loading your reports...</Text>
                    </View>
                ) : filteredAndSortedReports.length > 0 ? (
                    <View style={styles.reportsContainer}>
                        {filteredAndSortedReports.map((report, index) => (
                            <ReportCard key={`${report.id}-${index}`} report={report} index={index} />
                        ))}
                    </View>
                ) : (
                    <EmptyState />
                )}
            </Animated.ScrollView>


            <ReportDetailModal />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    // Header styles
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: Platform.OS === 'ios' ? 180 : 160,
        zIndex: 100,
        backgroundColor: 'transparent',
    },
    headerBlur: {
        flex: 1,
        overflow: 'hidden',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerGradient: {
        flex: 1,
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 15,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: 'white',
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        marginTop: 4,
    },
    headerStatsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 16,
        padding: 15,
        marginTop: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: 'white',
    },
    statLabel: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.9)',
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        marginHorizontal: 10,
    },
        
    // Scroll View styles
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: Platform.OS === 'ios' ? 180 : 160,
        paddingBottom: 100,
    },
    // Search styles
    searchContainer: {
        paddingHorizontal: 20,
        paddingBottom: 10,
        overflow: 'hidden',
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
        height: '100%',
        padding: 0,
    },
    // Filter header styles
    filterHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginTop: 10,
    },
    filterHeaderLeft: {
        flex: 1,
    },
    filterResultText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    filterHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerActionButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        marginRight: 10,
    },
    sortDropdownContainer: {
        position: 'relative',
    },
    sortDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    sortText: {
        fontSize: 14,
        color: '#4B5563',
        fontWeight: '500',
        marginRight: 4,
    },
    
    // Report card styles
    reportsContainer: {
        paddingHorizontal: 20,
    },
    cardWrapper: {
        marginBottom: 16,
    },
    cardContainer: {
        backgroundColor: 'white',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
        overflow: 'hidden',
    },
    cardTouchable: {
        flexDirection: 'row',
        padding: 2,
    },
    cardIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 12,
    },
    cardContent: {
        flex: 1,
        padding: 12,
        paddingLeft: 0,
        marginTop: 10,
    },
    cardHeader: {
        marginBottom: 6,
    },
    reportTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    reportDate: {
        fontSize: 13,
        color: '#6B7280',
    },
    cardDetails: {
        marginTop: 6,
    },
    doctorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    typeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailIcon: {
        marginRight: 6,
    },
    reportDoctor: {
        fontSize: 14,
        color: '#4B5563',
    },
    reportType: {
        fontSize: 14,
        color: '#4B5563',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    viewMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    viewMoreText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#4338CA',
        marginRight: 4,
    },
    
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '85%',
        width: '100%',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 10,
    },
    modalHeader: {
        height: 140,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
        zIndex: 10,
    },
    modalHeaderGradient: {
        flex: 1,
        padding: 16,
    },
    modalCloseButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 20,
        backgroundColor: 'rgba(0,0,0,0.2)',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalHeaderContent: {
        flex: 1,
        justifyContent: 'center',
        paddingTop: 10,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: 'white',
        marginBottom: 10,
    },
    modalHeaderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    modalInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
        marginBottom: 4,
    },
    modalInfoIcon: {
        marginRight: 6,
    },
    modalInfoText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
    },
    modalBody: {
        flex: 1,
    },
    modalBodyContent: {
        padding: 16,
    },
    modalSection: {
        marginBottom: 20,
    },
    modalSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8,
    },
    modalSectionContent: {
        fontSize: 15,
        lineHeight: 22,
        color: '#4B5563',
    },
    diagnosisBox: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#4338CA',
    },
    prescriptionContainer: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 10,
    },
    medicationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    medicationIcon: {
        marginRight: 8,
    },
    medicationText: {
        fontSize: 14,
        color: '#1F2937',
    },
    modalImage: {
        width: '100%',
        height: 180,
        borderRadius: 12,
        marginTop: 8,
        backgroundColor: '#F3F4F6',
    },
    modalFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 30 : 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        zIndex: 10,
    },
    modalActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    modalSecondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#4338CA',
        backgroundColor: 'white',
        flex: 0.45,
    },
    modalSecondaryButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4338CA',
        marginLeft: 8,
    },
    modalPrimaryButton: {
        flex: 0.52,
        shadowColor: '#4338CA',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
        borderRadius: 10,
        overflow: 'hidden',
    },
    modalPrimaryButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    modalPrimaryButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
        marginLeft: 8,
    },
    
    // Empty state styles
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 40,
    },
    contentContainer: {
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    animationContainer: {
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    animation: {
        width: '100%',
        height: '100%',
        alignSelf: 'center',
    },
    title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    textAlign: 'center',
    },
    subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 24,
    },
    suggestionsCard: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 24,
    },
    suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    },
    suggestionsList: {
    width: '100%',
    },
    suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    },  
    suggestionIcon: {
    marginRight: 12,
    },
    suggestionText: {
    fontSize: 14,
    color: '#4B5563',
    },
    resetButton: {
    backgroundColor: '#4338CA',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    },
    resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    },
    
    // Loading styles
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 12,
    }
});

export default PatientReportsScreen;