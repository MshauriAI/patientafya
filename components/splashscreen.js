import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions, StatusBar, Image, Platform } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { jwtDecode } from "jwt-decode";

const { width, height } = Dimensions.get('window');

// Minimum display time for splash screen (in milliseconds)
const MINIMUM_SPLASH_TIME = 4000; // 4 seconds minimum display time

export default function SplashScreen() {
  const [dimensions, setDimensions] = useState({ width, height });
  const [animationComplete, setAnimationComplete] = useState(false);
  const startTimeRef = useRef(Date.now());
  
  // Animation values
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(30)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const loadingWidth = useRef(new Animated.Value(0)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  
  // For responsive design
  useEffect(() => {
    // Initial render with correct dimensions
    setDimensions({ width: Dimensions.get('window').width, height: Dimensions.get('window').height });
    
    const handleDimensionChange = ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    };
    
    const subscription = Dimensions.addEventListener('change', handleDimensionChange);
    return () => subscription.remove();
  }, []);
  
  // Pulse animation for the heartbeat effect
  useEffect(() => {
    const animatePulse = () => {
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 400,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseScale, {
          toValue: 1.15,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 400,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => {
        setTimeout(animatePulse, 1500);
      });
    };
    
    // Start the animation
    animatePulse();
    
    // Cleanup
    return () => {
      pulseScale.stopAnimation();
    };
  }, []);
  
  // Navigation with enforced minimum display time
  useEffect(() => {
    if (animationComplete) {
      const checkTokenAndNavigate = async () => {
        try {
          // Calculate time elapsed since component mounted
          const elapsedTime = Date.now() - startTimeRef.current;
          const remainingTime = Math.max(0, MINIMUM_SPLASH_TIME - elapsedTime);
          
          // Ensure splash screen displays for at least MINIMUM_SPLASH_TIME
          if (remainingTime > 0) {
            await new Promise(resolve => setTimeout(resolve, remainingTime));
          }
          
          const token = await AsyncStorage.getItem("token");
          
          if (!token) {
            router.replace('/auth/sign-in');
            return;
          }
          
          try {
            const decoded = jwtDecode(token);
            const currentTime = Date.now() / 1000;
            
            if (decoded.exp < currentTime) {
              await AsyncStorage.removeItem("token");
              router.replace('/auth/sign-in');
              return;
            }
            
            const userInfo = await AsyncStorage.getItem("userInfo");
            if (userInfo) {
              console.log("User found: ", userInfo);
              router.replace("/(tabs)");
            } else {
              console.log("User not found");
              router.replace("/auth/sign-in");
            }
          } catch (decodeError) {
            console.error("Error decoding token", decodeError);
            await AsyncStorage.removeItem("token");
            router.replace('/auth/sign-in');
          }
        } catch (error) {
          console.error("Error validating token", error);
          router.replace('/auth/sign-in');
        }
      };
      
      checkTokenAndNavigate();
    }
  }, [animationComplete]);
  
  // Animation sequence
  useEffect(() => {
    // Don't start animations until dimensions are properly set
    if (dimensions.width <= 0 || dimensions.height <= 0) return;
    
    // Make sure we have a reference to when the splash screen started
    startTimeRef.current = Date.now();
    
    // Animation sequence
    Animated.sequence([
      // Logo animation
      Animated.parallel([
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(rotate, {
          toValue: 1,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        })
      ]),
      // Title animation
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(textSlide, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.back()),
          useNativeDriver: Platform.OS !== 'web',
        })
      ]),
      // Tagline animation
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 500,
        delay: 100,
        useNativeDriver: Platform.OS !== 'web',
      }),
      // Show loading bar
      Animated.timing(loadingOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }),
      // Animate loading bar width - use a direct approach for web
      ...(Platform.OS === 'web' 
        ? [
          // Custom animation for web browsers
          Animated.timing(loadingWidth, {
            toValue: 0.7 * Math.min(dimensions.width * 0.7, 400),
            duration: 1200,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: false,
          })
        ] 
        : [
          // Standard animation for native
          Animated.timing(loadingWidth, {
            toValue: dimensions.width * 0.7,
            duration: 1200,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: false,
          })
        ]
      ),
    ]).start(() => {
      // Mark animation as complete to trigger navigation after minimum time
      setAnimationComplete(true);
    });
  }, [dimensions]);
  
  // Calculate responsive sizes
  const isWeb = Platform.OS === 'web';
  
  // Fixed logo size calculation for consistent appearance
  const baseLogoSize = Math.min(dimensions.width, dimensions.height) * 0.25;
  const logoSize = isWeb 
    ? Math.max(baseLogoSize, 150) // Ensure minimum size on web
    : baseLogoSize;
  
  const fontSize = dimensions.width < 375 ? 36 : 42;
  const taglineSize = dimensions.width < 375 ? 16 : 18;
  
  const spinInterpolation = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-5deg', '5deg']
  });
  
  // For web browsers, we'll use a manual div for the progress bar if needed
  // to ensure it's visible in Chrome/Safari
  const [progressBarWidth, setProgressBarWidth] = useState(0);

  // Sync the animated value with the manual state
  useEffect(() => {
    if (Platform.OS === 'web') {
      const listener = loadingWidth.addListener(({ value }) => {
        setProgressBarWidth(value);
      });
      
      return () => loadingWidth.removeListener(listener);
    }
  }, [loadingWidth]);
  
  return (
    <View style={[styles.container, { width: dimensions.width, height: dimensions.height }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Background color */}
      <View style={styles.backgroundGradient} />
      
      {/* Main content container */}
      <View style={styles.content}>
        {/* Logo with pulsing effect */}
        <Animated.View style={[
          styles.logoContainer,
          {
            opacity: fadeIn,
            transform: [
              { scale: scale },
              { rotate: spinInterpolation }
            ]
          }
        ]}>
          <View style={[styles.logoCircle, { width: logoSize, height: logoSize }]}>
            <Animated.View style={[
              styles.pulseCircle,
              { transform: [{ scale: pulseScale }] }
            ]} />
            <Image
              source={require('../assets/images/new.jpg')}
              style={[
                styles.logoImage,
                { 
                  width: logoSize * 0.8, 
                  height: logoSize * 0.8, 
                  borderRadius: logoSize * 0.4 
                }
              ]}
              resizeMode="contain"
              testID="app-logo"
            />
          </View>
        </Animated.View>
        
        {/* Brand name with stethoscope icon - Fixed for Chrome/Safari */}
        <Animated.View style={[
          styles.brandContainer,
          {
            opacity: textOpacity,
            transform: [{ translateY: textSlide }]
          }
        ]}>
          <View style={[
            styles.headerContainer,
            isWeb && { minWidth: 200, flexDirection: 'row', flexWrap: 'nowrap' }
          ]}>
            {/* Stethoscope icon in gradient container */}
            {/* <LinearGradient
              colors={['#15803d', '#0369a1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.iconContainer}
            >
              <FontAwesome5 name="stethoscope" size={isWeb ? 24 : 22} color="white" />
            </LinearGradient> */}
            {/* <Image
              source={require('../assets/images/new.jpg')}
              style={styles.iconContainer}
              resizeMode="cover" // Optional: ensures the image fills the container nicely
            /> */}
            
            {/* Brand text - fixed for web browsers */}
            {isWeb ? (
              <div style={{ 
                fontSize: '28px',
                fontWeight: 600,
                color: '#0369a1',
                textShadow: '1px 1px 1px rgba(21, 128, 61, 0.3)',
                whiteSpace: 'nowrap'
              }}>
                Afya Mkononi
              </div>
            ) : (
              <Text style={styles.brandText}>
                Afya Mkononi
              </Text>
            )}
          </View>
        </Animated.View>
        
        {/* Tagline - Fixed with HTML for web */}
        <Animated.View style={[
          styles.taglineContainer,
          { opacity: taglineOpacity }
        ]}>
          {isWeb ? (
            <div style={{ 
              fontSize: Math.max(taglineSize, 16) + 'px',
              fontWeight: 400,
              letterSpacing: '0.25px',
              color: '#3d4852',
              textAlign: 'center',
              whiteSpace: 'nowrap'
            }}>
              Quality Healthcare From Anywhere
            </div>
          ) : (
            <Text style={styles.tagline} numberOfLines={1}>
              Quality Healthcare From Anywhere
            </Text>
          )}
        </Animated.View>
        
        {/* Loading bar - Native version */}
        {!isWeb && (
          <Animated.View style={[
            styles.loadingBarContainer,
            {
              opacity: loadingOpacity,
              width: dimensions.width * 0.7,
              maxWidth: 400,
            }
          ]}>
            <Animated.View
              style={[
                styles.loadingBar,
                { width: loadingWidth }
              ]}
            />
          </Animated.View>
        )}
        
        {/* Loading bar - Web specific version using HTML */}
        {isWeb && (
          <Animated.View style={[
            { opacity: loadingOpacity, marginTop: 50 }
          ]}>
            <div style={{
              width: Math.min(dimensions.width * 0.7, 400) + 'px',
              height: '8px',
              backgroundColor: '#E3EFFA',
              borderRadius: '3px',
              overflow: 'hidden',
              position: 'relative',
            }}>
              <div style={{
                width: progressBarWidth + 'px',
                height: '100%',
                backgroundColor: '#22c55e',
                borderRadius: '3px',
                position: 'absolute',
                left: 0,
                top: 0,
              }} />
            </div>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F0F7FF',
    opacity: 0.85,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    
    // Cross-browser shadow solution
    ...(Platform.OS === 'web' 
      ? {
        boxShadow: '0 6px 15px rgba(0, 86, 163, 0.25)',
      } 
      : {
        elevation: 10,
        shadowColor: '#0056A3',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
      }
    ),
  },
  logoImage: {
    borderWidth: 2,
    borderColor: '#E8EFF5',
    backgroundColor: 'white',
  },
  pulseCircle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(3, 105, 161, 0.45)',
  },
  brandContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  // imageContainer: {
  //   width: 20,
  //   height: 20,
  //   borderRadius: 5,
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   overflow: 'hidden', // ensures rounded corners for the image
  // },
  brandText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0369a1',
    ...(Platform.OS !== 'ios' && {
      textShadowColor: 'rgba(21, 128, 61, 0.3)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 1,
    }),
  },
  taglineContainer: {
    marginTop: Platform.OS === 'web' ? 16 : 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  tagline: {
    fontWeight: '400',
    letterSpacing: 0.25,
    color: '#3d4852',
    textAlign: 'center',
  },
  loadingBarContainer: {
    height: 6,
    backgroundColor: '#E3EFFA',
    borderRadius: 3,
    marginTop: 60,
    overflow: 'hidden',
  },
  loadingBar: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 3,
  },
});