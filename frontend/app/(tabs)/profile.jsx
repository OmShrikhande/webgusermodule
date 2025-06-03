import { Colors } from '@/constants/Colors';
import { router, useNavigation, useFocusEffect } from 'expo-router';
import React, { useState, useCallback, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Animated,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

// Import modularized components
import {
  Header,
  AttendanceSection,
  SettingsSection,
  AccountSection,
  HelpSection,
  LogoutButton,
} from '@/components/profile';

// Use expoConfig instead of manifest
const { debuggerHost } = Constants.expoConfig?.hostUri
  ? { debuggerHost: Constants.expoConfig.hostUri }
  : { debuggerHost: undefined };
const localIP = debuggerHost ? debuggerHost.split(':').shift() : 'localhost';
const API_URL = `http://${localIP}:5000`;

const Profile = () => {
  const navigation = useNavigation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [user, setUser] = useState(null);
  const [latestAttendance, setLatestAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    navigation.setOptions({
      title: 'My Profile',
      headerTitleStyle: {
        fontWeight: 'bold',
        color: Colors.PRIMARY,
      },
      headerStyle: {
        backgroundColor: '#f8f8f8',
      },
    });

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [navigation]);

  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await axios.get(`${API_URL}/api/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setUser(response.data.user);
        setLatestAttendance(response.data.latestAttendance);
      }
    } catch (error) {
      console.log('Profile fetch error:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('userId');
        router.replace('/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserProfile();
  };

  // Settings toggles
  const toggleNotifications = () => setNotificationsEnabled((prev) => !prev);
  const toggleDarkMode = () => setDarkModeEnabled((prev) => !prev);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUserProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Profile Header */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <Header user={user} onEditAvatar={() => router.push('/image-picker')} />
      </Animated.View>

      {/* Attendance Section */}
      {latestAttendance && (
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <AttendanceSection latestAttendance={latestAttendance} />
        </Animated.View>
      )}

      {/* Settings Section */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <SettingsSection
          notificationsEnabled={notificationsEnabled}
          darkModeEnabled={darkModeEnabled}
          toggleNotifications={toggleNotifications}
          toggleDarkMode={toggleDarkMode}
        />
      </Animated.View>

      {/* Account Section */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <AccountSection />
      </Animated.View>

      {/* Help Section */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <HelpSection />
      </Animated.View>

      {/* Logout Button */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <LogoutButton />
      </Animated.View>

      {/* App Info */}
      <Animated.View
        style={[
          styles.appInfo,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.appVersion}>Version 1.0.0</Text>
        <Text style={styles.appCopyright}>
          © 2024 {Colors.Appname}. All rights reserved.
        </Text>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.GRAY,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: Colors.GRAY,
    marginTop: 10,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: Colors.PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  appInfo: {
    alignItems: 'center',
    marginVertical: 30,
    paddingHorizontal: 20,
  },
  appVersion: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  appCopyright: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default Profile;