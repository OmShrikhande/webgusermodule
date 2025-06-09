import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Colors } from '@/constants/Colors';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { cancelLoginNotifications, showLogoutNotification } from '@/notificationService';

// Dynamically get local IP for API URL
const { debuggerHost } = Constants.expoConfig?.hostUri
  ? { debuggerHost: Constants.expoConfig.hostUri }
  : { debuggerHost: undefined };
const localIP = debuggerHost ? debuggerHost.split(':').shift() : 'localhost';
const API_URL = `http://${localIP}:5000`;

const LogoutButton = () => {
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (token) {
                await axios.post(`${API_URL}/api/logout`, {}, {
                  headers: { Authorization: `Bearer ${token}` }
                });
              }
            } catch (error) {
              // Optionally log error, but proceed with logout
              console.error('Error during logout:', error);
            } finally {
              // Handle logout notifications
              try {
                // Cancel login notifications
                await cancelLoginNotifications();
                
                // Show logout notification
                await showLogoutNotification(new Date().getTime());
                
                // Clear all task notification tracking data
                await AsyncStorage.removeItem('notifiedTaskIds');
                await AsyncStorage.removeItem('processingNotifications');
                await AsyncStorage.removeItem('lastNotificationCheckTime');
                await AsyncStorage.removeItem('currentLocations');
                await AsyncStorage.removeItem('taskUpdated');
                await AsyncStorage.removeItem('lastTaskUpdateTime');
              } catch (error) {
                console.error('Error handling logout notifications:', error);
              }
              
              // Clear auth data
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('userId');
              
              // Navigate to login
              router.replace('/login');
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
      <Text style={styles.logoutText}>Logout</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  logoutButton: {
    marginHorizontal: 15,
    marginTop: 20,
    marginBottom: 10,
    backgroundColor: Colors.PRIMARY,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LogoutButton;