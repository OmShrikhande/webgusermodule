import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { startBackgroundLocationTracking } from './locationService';

// Import API_URL from constants.js
import { API_URL } from './constants';

// Configure notifications - PARTIALLY ENABLED (login/logout only)
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Check notification type
    const data = notification.request.content.data || {};
    
    // Only allow login and logout notifications
    if (data.type === 'login' || data.type === 'login_sticky' || data.type === 'logout') {
      return {
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    } else {
      // Disable all other notifications
      return {
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
      };
    }
  },
});

// Set up local notifications
export async function setupLocalNotifications() {
  try {
    // Request notification permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get permission for notifications!');
      return false;
    }
    
    if (Platform.OS === 'android') {
      // Set notification channel for Android
      await Notifications.setNotificationChannelAsync('app-notifications', {
        name: 'App Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    
    console.log('Notification permissions granted');
    return true;
  } catch (error) {
    console.error('Error setting up notifications:', error);
    return false;
  }
}

// Show a local notification
export async function showTrackingNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Location Tracking Active",
      body: "Your location is being tracked in the background. Please don't force close the app.",
      data: { type: 'tracking_reminder' },
      sticky: false,
      autoDismiss: true,
    },
    trigger: null, // Show immediately
  });
}

// Show a login notification
export async function showLoginNotification(timestamp) {
  // First, cancel any existing login notifications
  await cancelLoginNotifications();
  
  try {
    // Cancel ALL previous notifications first to clear any duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
    
    // Regular notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Login Successful",
        body: `You logged in at ${new Date(timestamp).toLocaleTimeString()}`,
        data: { type: 'login' },
        sticky: false,
        autoDismiss: true,
      },
      trigger: null, // Show immediately
    });
    
    // Create ONLY ONE sticky notification
    if (Platform.OS === 'android') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Login Session Active",
          body: "Your attendance tracking is active. Don't force close the app.",
          data: { type: 'login_sticky' },
          // Android-specific options
          sticky: true, // Prevent notification from being dismissed automatically
          ongoing: true, // User can't dismiss by swiping
          color: '#4CAF50',
        },
        identifier: 'login-sticky-notification', // Use a fixed identifier for this notification
        trigger: null, // Show immediately
      });
    }
    
    console.log('Login notifications created successfully');
  } catch (error) {
    console.error('Error creating login notifications:', error);
  }
}

// Cancel existing login notifications
export async function cancelLoginNotifications() {
  try {
    // Cancel the specific sticky login notification by identifier
    await Notifications.cancelScheduledNotificationAsync('login-sticky-notification');
    
    // Get all active notifications
    const activeNotifications = await Notifications.getPresentedNotificationsAsync();
    
    // Find and dismiss any login-related notifications
    for (const notification of activeNotifications) {
      const data = notification.request.content.data;
      if (data && (data.type === 'login' || data.type === 'login_sticky')) {
        await Notifications.dismissNotificationAsync(notification.identifier);
      }
    }
    
    console.log('All login notifications cleared successfully');
  } catch (error) {
    console.error('Error canceling login notifications:', error);
    
    // As a fallback, try to dismiss all notifications
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (err) {
      console.error('Failed to dismiss all notifications:', err);
    }
  }
}

// Show a logout notification
export async function showLogoutNotification(timestamp) {
  // Cancel the sticky login notification first
  await cancelLoginNotifications();
  
  // Reset notification tracking for tasks
  await AsyncStorage.removeItem('notifiedTaskIds');
  
  // Show logout notification
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Logout Successful",
      body: `You logged out at ${new Date(timestamp).toLocaleTimeString()}`,
      data: { type: 'logout' },
      sticky: false,
      autoDismiss: true,
    },
    trigger: null, // Show immediately
  });
}

// Show a task assignment notification
export async function showTaskAssignmentNotification(taskTitle) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "New Task Assigned",
      body: `You have been assigned a new task: ${taskTitle}`,
      data: { type: 'task_assignment' },
      sticky: false, // Make sure it's not sticky
      autoDismiss: true, // Allow system to dismiss it
    },
    trigger: null, // Show immediately
  });
}

// Show a task status update notification
export async function showTaskStatusUpdateNotification(taskTitle, status) {
  let title = "Task Update";
  let body = `Task "${taskTitle}" `;
  
  switch(status) {
    case 'In Progress':
      title = "Task Started";
      body += "has been started";
      break;
    case 'Completed':
      title = "Task Completed";
      body += "has been completed";
      break;
    case 'Cancelled':
      title = "Task Cancelled";
      body += "has been cancelled";
      break;
    default:
      body += `status changed to ${status}`;
  }
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { type: 'task_status_update', status },
      sticky: false, // Make sure it's not sticky
      autoDismiss: true, // Allow system to dismiss it
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
      sticky: false,
      autoDismiss: true,
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
  
  // Instead of returning a cleanup function, we set up a cleanup for unmount
  console.log('Notification listeners set up successfully');
  
  // Return the subscriptions in case we want to manually clean them up later
  return {
    foregroundSubscription,
    responseSubscription,
    cleanup: () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    }
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