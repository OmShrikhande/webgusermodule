import React, { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { API_URL } from '../constants';
import * as Notifications from 'expo-notifications';
import { 
  showLoginNotification, 
  showLogoutNotification,
  showTaskAssignmentNotification,
  showTaskStatusUpdateNotification,
  setupLocalNotifications
} from '../notificationService';

// API_URL is now imported from constants.js

// This component doesn't render anything but runs in the background to listen for notifications
const NotificationListener = () => {
  const [lastNotificationTimestamp, setLastNotificationTimestamp] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    // Only allow login/logout notifications
    const setupNotificationListeners = async () => {
      try {
        // Set up notification listeners for login/logout
        const permissionGranted = await setupLocalNotifications();
        
        if (permissionGranted) {
          // Listen for foreground notifications
          const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
            const data = notification.request.content.data || {};
            
            // Only log login/logout notifications
            if (data.type === 'login' || data.type === 'login_sticky' || data.type === 'logout') {
              console.log(`Received ${data.type} notification`);
            }
          });
          
          // Listen for notification responses
          const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data || {};
            
            // Only handle login/logout notification responses
            if (data.type === 'login' || data.type === 'login_sticky' || data.type === 'logout') {
              console.log(`User responded to ${data.type} notification`);
            }
          });
          
          // Return cleanup function
          return () => {
            foregroundSubscription.remove();
            responseSubscription.remove();
          };
        }
      } catch (error) {
        console.error('Error setting up notification listeners:', error);
      }
      
      return () => {};
    };
    
    // Set up the listeners
    const cleanup = setupNotificationListeners();
    
    // Clean up on unmount
    return () => {
      if (cleanup) cleanup();
    };
    
    /*
    // DISABLED: Original notification initialization code
    const initNotifications = async () => {
      const permissionGranted = await setupLocalNotifications();
      if (permissionGranted) {
        // Start polling when component mounts
        checkForNewNotifications();
        const interval = setInterval(checkForNewNotifications, 15000); // Check every 15 seconds
        
        // Cleanup on unmount
        return () => {
          clearInterval(interval);
        };
      }
    };

    // Listen for app state changes (foreground, background, inactive)
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
      if (nextAppState === 'active') {
        // App came to foreground, check for notifications immediately
        checkForNewNotifications();
      }
    });

    const cleanup = initNotifications();

    // Cleanup on unmount
    return () => {
      appStateSubscription.remove();
      if (cleanup) cleanup();
    };
    */
  }, []);

  const checkForNewNotifications = async () => {
    // DISABLED to prevent notification spam
    return;
    
    /*
    // Original code - DISABLED
    try {
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');
      
      if (!token || !userId) {
        console.log('Authentication required to check notifications');
        return;
      }

      // Get last notification time from storage or use current timestamp if not set
      const storedTimestamp = await AsyncStorage.getItem('lastNotificationCheck');
      const timestamp = storedTimestamp || new Date().toISOString();
      
      // Query for notifications newer than the last check
      const response = await axios.get(
        `${API_URL}/api/notifications/${userId}?isRead=false`, 
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        const newNotifications = response.data.notifications;
        
        // Process new notifications to show system notifications
        newNotifications.forEach(notification => {
          const notificationTime = new Date(notification.timestamp);
          const lastCheckTime = new Date(timestamp);
          
          // Only show notifications that are newer than the last check
          if (notificationTime > lastCheckTime) {
            const data = notification.data || {};
            
            // Display different types of notifications
            switch (data.type) {
              case 'login':
                showLoginNotification(notification.timestamp);
                break;
              case 'logout':
                showLogoutNotification(notification.timestamp);
                break;
              case 'task_assignment':
                showTaskAssignmentNotification(data.taskTitle || 'New task');
                break;
              case 'task_status_update':
                showTaskStatusUpdateNotification(
                  data.taskTitle || 'A task', 
                  data.status || 'updated'
                );
                break;
              default:
                // For general notifications, just show the message
                if (notification.message) {
                  showGeneralNotification(notification.message);
                }
            }
          }
        });
        
        // Update the last check timestamp
        await AsyncStorage.setItem('lastNotificationCheck', new Date().toISOString());
      }
    } catch (error) {
      console.error('Error checking for notifications:', error);
    }
    */
  };
  
  // Function to show general notifications - DISABLED
  const showGeneralNotification = async (message) => {
    // Completely disabled - no logging
    return;
  };

  // This component doesn't render anything visible
  return null;
};

export default NotificationListener;