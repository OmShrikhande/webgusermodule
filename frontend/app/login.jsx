import { Colors } from '@/constants/Colors';
import { router, useNavigation } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [attendanceInfo, setAttendanceInfo] = useState(null);
  
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleLogin = async () => {
    setError('');
    setAttendanceInfo(null);
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post('http://192.168.1.57:5000/api/admin/login', {
        email,
        password
      });

      const { token, message, attendanceTime, attendanceDate } = response.data;

      await AsyncStorage.setItem('token', token);
      
      // Set attendance information
      if (attendanceTime && attendanceDate) {
        const isFirstAttendance = message && message.includes('marked successfully');
        
        setAttendanceInfo({
          time: attendanceTime,
          date: attendanceDate,
          message: message || 'Attendance marked successfully',
          isFirstAttendance: isFirstAttendance
        });
        
        // Show attendance message for 2 seconds before redirecting
        setIsLoading(false);
        setTimeout(() => {
          router.replace('/(tabs)/home');
        }, 2000);
      } else {
        setIsLoading(false);
        router.replace('/(tabs)/home');
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/icon.png')}
            style={styles.logo}
          />
          <Text style={styles.appName}>{Colors.Appname}</Text>
        </View>
        
        <View style={styles.formContainer}>
          <Text style={styles.title}>Login</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {attendanceInfo ? (
            <View style={[
              styles.attendanceContainer, 
              attendanceInfo.isFirstAttendance ? styles.firstAttendance : styles.existingAttendance
            ]}>
              <Text style={[
                styles.attendanceMessage,
                attendanceInfo.isFirstAttendance ? styles.successText : styles.warningText
              ]}>
                {attendanceInfo.message}
              </Text>
              <Text style={[
                styles.attendanceText,
                attendanceInfo.isFirstAttendance ? styles.successText : styles.warningText
              ]}>
                Date: {attendanceInfo.date}
              </Text>
              <Text style={[
                styles.attendanceText,
                attendanceInfo.isFirstAttendance ? styles.successText : styles.warningText
              ]}>
                Time: {attendanceInfo.time}
              </Text>
            </View>
          ) : null}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity 
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 100, height: 100, borderRadius: 15 },
  appName: {
    fontSize: 28,
    fontFamily: 'flux-bold',
    color: Colors.SECONDARY,
    marginTop: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  formContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: Colors.PRIMARY,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  forgotPassword: { alignItems: 'center', marginTop: 15 },
  forgotPasswordText: { color: Colors.PRIMARY, fontSize: 14 },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signupText: { color: '#666', fontSize: 14 },
  signupLink: { color: Colors.PRIMARY, fontSize: 14, fontWeight: 'bold' },
  errorText: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
  },
  attendanceContainer: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
  },
  firstAttendance: {
    backgroundColor: '#e6f7e6',
    borderColor: '#c3e6cb',
  },
  existingAttendance: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeeba',
  },
  attendanceMessage: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  attendanceText: {
    fontSize: 14,
    textAlign: 'center',
  },
  successText: {
    color: '#155724', // Green text for first attendance
  },
  warningText: {
    color: '#856404', // Yellow/amber text for existing attendance
  },
});