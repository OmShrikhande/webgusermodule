import { Colors } from '@/constants/Colors';
import { router, useNavigation } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');

// Dynamically get local IP for API URL (Expo SDK 49+)
const { debuggerHost } = Constants.expoConfig?.hostUri
  ? { debuggerHost: Constants.expoConfig.hostUri }
  : { debuggerHost: undefined };
const localIP = debuggerHost ? debuggerHost.split(':').shift() : 'localhost';
const API_URL = `http://${localIP}:5000`;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [attendanceInfo, setAttendanceInfo] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const logoRotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Logo rotation animation
    Animated.loop(
      Animated.timing(logoRotateAnim, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation for loading states
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Request location permission and get user location when component mounts
    requestLocationPermission().then((granted) => {
      if (granted) getUserLocation();
    });
  }, [navigation]);

  // Request location permission
  const requestLocationPermission = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied. Please enable location services.');
        return false;
      }
      console.log('Location permission granted');
      return true;
    } catch (err) {
      console.error('Permission error:', err);
      setLocationError('Failed to request location permission.');
      return false;
    }
  };

  // Function to get user's current location
  const getUserLocation = async () => {
    setLocationError('');
    try {
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
      });
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      console.log('User location:', location.coords);
    } catch (error) {
      console.error('Geolocation error:', error);
      setLocationError('Unable to get your location. Please enable location services.');
    }
  };

  const checkUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        const user = response.data.user;
        console.log('User profile data:', user);
        console.log('Has profile image:', !!user.profileImage);
        console.log('Has name:', !!user.name);
        
        // If user doesn't have a profile image or name, redirect to image picker
        if (!user.profileImage || !user.name) {
          console.log('Redirecting to image picker...');
          router.replace('/image-picker');
        } else {
          console.log('User has profile, redirecting to home...');
          router.replace('/(tabs)/home');
        }
      } else {
        console.log('Profile fetch failed, going to home...');
        // If profile fetch fails, still go to home
        router.replace('/(tabs)/home');
      }
    } catch (error) {
      console.error('Profile check error:', error);
      // If profile check fails, still go to home
      router.replace('/(tabs)/home');
    }
  };

  const handleLogin = async () => {
    setError('');
    setAttendanceInfo(null);

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    // If location is not available, try to get it again
    if (!userLocation) {
      const granted = await requestLocationPermission();
      if (granted) await getUserLocation();
      // Proceed with login even if location is not available
      // Backend will mark attendance as absent
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/admin/login`, {
        email,
        password,
        location: userLocation,
      });

      const { token, message, attendanceTime, attendanceDate, attendanceStatus, location } = response.data;

      // Store token and userId (decoded from JWT or fetched separately)
      await AsyncStorage.setItem('token', token);
      // Since /api/admin/login doesn't return user.id, decode JWT to get id
      const decodedToken = JSON.parse(atob(token.split('.')[1]));
      await AsyncStorage.setItem('userId', decodedToken.id);

      // Set attendance information
      if (attendanceTime && attendanceDate) {
        const isFirstAttendance = !message.includes('already marked');
        const isPresent = attendanceStatus === 'present';

        setAttendanceInfo({
          time: attendanceTime,
          date: attendanceDate,
          message: message || 'Login successful',
          isFirstAttendance: isFirstAttendance,
          isPresent: isPresent,
          distance: location?.distance,
          isInOffice: location?.isInOffice,
        });

        // Show attendance message for 3 seconds before redirecting
        setIsLoading(false);
        setTimeout(() => {
          // Check if user has profile image, if not redirect to image picker
          checkUserProfile();
        }, 3000);
      } else {
        setIsLoading(false);
        // Check if user has profile image, if not redirect to image picker
        checkUserProfile();
      }
    } catch (err) {
      setIsLoading(false);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message); // Display specific backend error
      } else {
        setError('Could not connect to server. Please check your network or server status.');
      }
      console.error('Login error:', err.message);
    }
  };

  const logoRotate = logoRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.PRIMARY} />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={[Colors.PRIMARY, Colors.SECONDARY, Colors.LIGHT]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating Circles Animation */}
      <View style={styles.floatingCircles}>
        <Animated.View style={[styles.circle, styles.circle1, { transform: [{ scale: pulseAnim }] }]} />
        <Animated.View style={[styles.circle, styles.circle2, { transform: [{ scale: pulseAnim }] }]} />
        <Animated.View style={[styles.circle, styles.circle3, { transform: [{ scale: pulseAnim }] }]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Section */}
          <Animated.View 
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            {/* Enlightenment Glow Effect (behind logo) */}
            <Animated.View
              style={[
                styles.glow,
                {
                  opacity: pulseAnim.interpolate({
                    inputRange: [0.6, 0.7],
                    outputRange: [0.3, 0.2]
                  }),
                  transform: [
                    { scale: pulseAnim }
                  ]
                }
              ]}
            />
            {/* Logo Image (above glow) */}
            <Image
              source={require('../assets/images/applogo.png')}
              style={styles.logo}
            />
            <Text style={styles.appName}>{Colors.Appname}</Text>
            <Text style={styles.tagline}>Attendance Management System</Text>
          </Animated.View>

          {/* Form Container */}
          <Animated.View 
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            <View style={styles.formHeader}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>
            </View>

            {/* Error Display */}
            {error ? (
              <Animated.View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#fff" />
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            ) : null}

            {/* Attendance Info Display */}
            {attendanceInfo ? (
              <Animated.View
                style={[
                  styles.attendanceContainer,
                  attendanceInfo.isPresent
                    ? styles.presentAttendance
                    : styles.absentAttendance,
                ]}
              >
                <Ionicons 
                  name={attendanceInfo.isPresent ? "checkmark-circle" : "close-circle"} 
                  size={24} 
                  color={attendanceInfo.isPresent ? Colors.SUCCESS : "#F44336"} 
                />
                <View style={styles.attendanceInfo}>
                  <Text style={styles.attendanceMessage}>
                    {attendanceInfo.message}
                  </Text>
                  <Text style={styles.attendanceDetails}>
                    {attendanceInfo.date} at {attendanceInfo.time}
                  </Text>
                  {attendanceInfo.distance !== undefined && (
                    <Text style={styles.attendanceDetails}>
                      Distance: {attendanceInfo.distance}m from office
                    </Text>
                  )}
                </View>
              </Animated.View>
            ) : null}

            {/* Location Error Display */}
            {locationError ? (
              <Animated.View style={styles.locationErrorContainer}>
                <Ionicons name="location-outline" size={20} color="#FF6B6B" />
                <Text style={styles.locationErrorText}>{locationError}</Text>
              </Animated.View>
            ) : null}

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={Colors.GRAY} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor={Colors.GRAY}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.GRAY} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors.GRAY}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color={Colors.GRAY} 
                />
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonLoading]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <LinearGradient
                colors={isLoading ? [Colors.GRAY, Colors.GRAY] : [Colors.SECONDARY, Colors.PRIMARY]}
                style={styles.loginButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <Ionicons name="hourglass-outline" size={20} color="#fff" />
                  </Animated.View>
                ) : (
                  <Ionicons name="log-in-outline" size={20} color="#fff" />
                )}
                <Text style={styles.loginButtonText}>
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Forgot Password */}
            

            {/* Sign Up Link */}
          
          </Animated.View>

          {/* Footer */}
          <Animated.View 
            style={[
              styles.footer,
              { opacity: fadeAnim }
            ]}
          >
            <Text style={styles.footerText}>© 2025 {Colors.Appname}</Text>
            <Text style={styles.footerSubtext}>Secure • Reliable • Efficient</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  floatingCircles: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  circle: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 100,
    height: 100,
    top: '10%',
    left: '10%',
  },
  circle2: {
    width: 150,
    height: 150,
    top: '60%',
    right: '10%',
  },
  circle3: {
    width: 80,
    height: 80,
    top: '30%',
    right: '20%',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 25,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.WHITE,
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)', // more transparent for glass effect
    borderRadius: 30,
    padding: 32,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,01)',
    // Remove backdropFilter if not supported, or use expo-blur for real blur
    // backdropFilter: 'blur(12px)', // Only works on web
    // For React Native, use expo-blur:
    // overflow: 'hidden',
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.PRIMARY,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.GRAY,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  errorText: {
    color: '#fff',
    marginLeft: 10,
    flex: 1,
    fontSize: 14,
  },
  attendanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  presentAttendance: {
    backgroundColor: '#E8F5E8',
    borderLeftWidth: 4,
    borderLeftColor: Colors.SUCCESS,
  },
  absentAttendance: {
    backgroundColor: '#FFF0F0',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  attendanceInfo: {
    marginLeft: 15,
    flex: 1,
  },
  attendanceMessage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.PRIMARY,
    marginBottom: 5,
  },
  attendanceDetails: {
    fontSize: 14,
    color: Colors.GRAY,
    marginBottom: 2,
  },
  locationErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  locationErrorText: {
    color: '#FF6B6B',
    marginLeft: 10,
    flex: 1,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
    marginBottom: 20,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  inputIcon: {
    marginRight: 15,
  },
  input: {
    flex: 1,
    paddingVertical: 18,
    fontSize: 16,
    color: Colors.PRIMARY,
  },
  eyeIcon: {
    padding: 5,
  },
  loginButton: {
    borderRadius: 15,
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  loginButtonLoading: {
    opacity: 0.7,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 15,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  forgotPassword: {
    alignItems: 'center',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: Colors.SECONDARY,
    fontSize: 16,
    fontWeight: '500',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    color: Colors.GRAY,
    fontSize: 16,
  },
  signupLink: {
    color: Colors.SECONDARY,
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
    paddingBottom: 20,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 5,
  },
  footerSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  glow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -30,
    left: '50%',
    marginLeft: -90,
    backgroundColor: 'rgba(255, 255, 200, 0.7)', // soft yellowish glow
    shadowColor: '#fffbe6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 0,
  },
});