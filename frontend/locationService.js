import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const LOCATION_TASK_NAME = 'background-location-task';

// Import API_URL from constants.js
import { API_URL } from './constants';

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    // Send locations to your backend here if needed
    if (locations && locations.length > 0) {
      try {
        const userId = await AsyncStorage.getItem('userId');
        const token = await AsyncStorage.getItem('token');
        
        if (!userId || !token) {
          console.warn('Background task: No userId or token found');
          return;
        }
        
        const latest = locations[0];
        console.log('Background location:', latest.coords);
        
        // Send location to backend
        await fetch(`${API_URL}/api/store-location`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: userId,
            location: {
              latitude: latest.coords.latitude,
              longitude: latest.coords.longitude
            },
            timestamp: new Date().toISOString(),
            isBackground: true
          }),
        });
        
        // Check for nearby visit locations
        await fetch(`${API_URL}/api/check-visit-locations`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: userId,
            location: {
              latitude: latest.coords.latitude,
              longitude: latest.coords.longitude
            },
          }),
        });
      } catch (error) {
        console.error('Error in background location task:', error);
      }
    }
  }
});

export async function checkPermissions() {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  return fg === 'granted' && bg === 'granted';
}

export async function startBackgroundLocationTracking() {
  try {
    // First check if permissions are granted
    const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
    const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
    
    // If permissions aren't granted, request them
    if (foregroundStatus !== 'granted') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Foreground location permission denied');
        return;
      }
    }
    
    if (backgroundStatus !== 'granted') {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Background location permission denied');
        return;
      }
    }
    
    // Check if tracking is already started
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
      .catch(() => false); // Handle potential errors
    
    if (!hasStarted) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced, // Balance between accuracy and battery
        timeInterval: 30000, // 30 seconds
        distanceInterval: 30, // 30 meters
        deferredUpdatesInterval: 60000, // 1 minute (helps with iOS background updates)
        deferredUpdatesDistance: 50, // 50 meters (helps with iOS background updates)
        showsBackgroundLocationIndicator: true,
        pausesUpdatesAutomatically: false, // Prevent automatic pausing
        activityType: Location.ActivityType.Other,
        foregroundService: {
          notificationTitle: 'Location Tracking Active',
          notificationBody: 'Your location is being tracked in the background.',
          notificationColor: '#4630EB',
        },
      });
      console.log('Background location tracking started');
    } else {
      console.log('Background location tracking was already running');
    }
  } catch (error) {
    console.error('Error starting background location tracking:', error);
  }
}

export async function stopLocationTracking() {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (hasStarted) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}
