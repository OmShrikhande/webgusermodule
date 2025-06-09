import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { startBackgroundLocationTracking } from './locationService';

// Get the local IP address automatically from Expo
const { debuggerHost } = Constants.expoConfig?.hostUri
  ? { debuggerHost: Constants.expoConfig.hostUri }
  : { debuggerHost: undefined };
const localIP = debuggerHost ? debuggerHost.split(':').shift() : 'localhost';
const API_URL = `http://${localIP}:5000`;

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Register for push notifications
export async function registerForPushNotifications() {
  let token;
  
  if (Platform.OS === 'android') {
    // Set notification channel for Android
    await Notifications.setNotificationChannelAsync('location-tracking', {
      name: 'Location Tracking',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
  
  if (Device.isDevice) {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    // Cannot get push token if permission is not granted
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    // Get push token
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })).data;
    
    console.log('Push token:', token);
    
    // Store token in AsyncStorage
    await AsyncStorage.setItem('pushToken', token);
    
    // Send token to backend
    const userId = await AsyncStorage.getItem('userId');
    const authToken = await AsyncStorage.getItem('token');
    
    if (userId && authToken) {
      try {
        await fetch(`${API_URL}/api/register-device`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            userId,
            pushToken: token,
            deviceInfo: {
              platform: Platform.OS,
              model: Device.modelName,
            }
          }),
        });
      } catch (error) {
        console.error('Error registering device for push notifications:', error);
      }
    }
  } else {
    console.log('Must use physical device for push notifications');
  }
}

// Show a local notification
export async function showTrackingNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Location Tracking Active",
      body: "Your location is being tracked in the background. Please don't force close the app.",
      data: { type: 'tracking_reminder' },
    },
    trigger: null, // Show immediately
  });
}

// Show a periodic reminder notification
export async function scheduleTrackingReminder() {
  // Cancel any existing reminders
  await Notifications.cancelAllScheduledNotificationsAsync();
  
  // Schedule a new reminder every 30 minutes
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Location Tracking Reminder",
      body: "Please ensure the app remains running for continuous location tracking.",
      data: { type: 'tracking_reminder' },
    },
    trigger: {
      seconds: 1800, // 30 minutes
      repeats: true,
    },
  });
}

// Handle notification response
export function setupNotificationListeners() {
  // When app receives notification while in foreground
  const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received in foreground:', notification);
  });
  
  // When user taps on notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification response received:', response);
    
    const data = response.notification.request.content.data;
    
    // If this is a tracking restart notification, restart tracking
    if (data?.type === 'restart_tracking') {
      startBackgroundLocationTracking().catch(error => {
        console.error('Failed to restart tracking from notification:', error);
      });
    }
  });
  
  // Return cleanup function
  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}

// Handle background notifications
export function setupBackgroundNotificationHandler() {
  // This will be called when a notification is received while the app is in the background
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data;
      
      // If this is a silent tracking notification, restart tracking
      if (data?.type === 'silent_tracking') {
        try {
          await startBackgroundLocationTracking();
          console.log('Tracking restarted from background notification');
        } catch (error) {
          console.error('Failed to restart tracking from background notification:', error);
        }
      }
      
      return {
        shouldShowAlert: data?.silent !== true,
        shouldPlaySound: data?.silent !== true,
        shouldSetBadge: false,
      };
    },
  });
}