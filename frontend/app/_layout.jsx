import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { View, Text, LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Filter out non-critical warnings to reduce console noise
LogBox.ignoreLogs([
  'Warning: Failed prop type',
  'Warning: Each child in a list',
  'Warning: Can\'t perform a React state update',
  'Warning: Encountered two children with the same key',
  '[expo-notifications]',
  'Non-serializable values were found in the navigation state',
  'VirtualizedLists should never be nested'
]);

import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemeProvider } from '@/context/ThemeContext';
import { 
  setupLocalNotifications, 
  setupNotificationListeners,
  showTrackingNotification,
  scheduleTrackingReminder,
  cancelLoginNotifications
} from '../notificationService';
import * as Notifications from 'expo-notifications';
import NotificationListener from '../components/NotificationListener';
import TaskRefreshService from '../components/TaskRefreshService';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Add a small delay to ensure all modules are properly initialized
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Re-enable login/logout notifications only
  useEffect(() => {
    const setupSelectiveNotifications = async () => {
      try {
        // Clear all existing notifications first
        await Notifications.cancelAllScheduledNotificationsAsync();
        await Notifications.dismissAllNotificationsAsync();
        
        // Clear task notification tracking data
        await AsyncStorage.removeItem('notifiedTaskIds');
        await AsyncStorage.removeItem('processingNotifications');
        await AsyncStorage.removeItem('lastNotificationCheckTime');
        await AsyncStorage.removeItem('currentLocations');
        
        // Check if user is logged in
        const userId = await AsyncStorage.getItem('userId');
        const token = await AsyncStorage.getItem('token');
        
        // Request notification permissions
        const permissionGranted = await setupLocalNotifications();
        
        // If user is logged in, show login notification
        if (permissionGranted && userId && token) {
          // Show login session notification
          await showLoginNotification(new Date().getTime());
        }
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    };
    
    // Setup selective notifications
    setupSelectiveNotifications();
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>An error occurred: {error.message}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <NavigationThemeProvider value={colorScheme === 'light' ? DefaultTheme : DarkTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="image-picker" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
        <NotificationListener />
        {/* TaskRefreshService disabled to prevent task notification spam */}
        {/* <TaskRefreshService refreshInterval={60000} /> */}
      </NavigationThemeProvider>
    </ThemeProvider>
  );
}
