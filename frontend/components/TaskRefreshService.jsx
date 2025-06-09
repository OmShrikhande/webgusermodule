import React, { useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { setupLocalNotifications } from '../notificationService';

// Configure notifications for foreground behavior - DISABLED COMPLETELY
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // All notifications disabled to stop spam
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

// Get the local IP address automatically from Expo
const { debuggerHost } = Constants.expoConfig?.hostUri
  ? { debuggerHost: Constants.expoConfig.hostUri }
  : { debuggerHost: undefined };
const localIP = debuggerHost ? debuggerHost.split(':').shift() : 'localhost';
const API_URL = `http://${localIP}:5000`;

// This component runs in the background to continuously check for task updates
const TaskRefreshService = ({ refreshInterval = 5000 }) => {
  const [userId, setUserId] = useState(null);
  const [currentLocations, setCurrentLocations] = useState([]);
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);
  const backgroundTimerRef = useRef(null);
  const lastFetchTimeRef = useRef(0);
  
  // Keep track of tasks we've already notified about to prevent duplicates
  const [notifiedTaskIds, setNotifiedTaskIds] = useState(new Set());

  // Helper function to show task notifications - COMPLETELY DISABLED
  const showTaskNotification = async (title, body, data = {}) => {
    // Disabled - no logging to reduce console spam
    return;
  };

  // Counter to limit log frequency
  const logCounterRef = useRef(0);
  
  // Function to check for task updates
  const checkForTaskUpdates = async () => {
    try {
      // First, verify we're logged in
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');
      
      if (!token || !userId) {
        return; // Not logged in, no need to check
      }
      
      // Check if notification processing is already in progress
      const isProcessing = await AsyncStorage.getItem('processingNotifications');
      if (isProcessing === 'true') {
        // Skip this cycle if we're already processing notifications
        return;
      }
      
      // Get the last check timestamp
      const lastCheckTime = await AsyncStorage.getItem('lastNotificationCheckTime');
      const now = Date.now();
      
      // Only run checks every 30 seconds to avoid excessive updates
      if (lastCheckTime && now - parseInt(lastCheckTime) < 30000) {
        return;
      }
      
      // Update the last check timestamp
      await AsyncStorage.setItem('lastNotificationCheckTime', now.toString());
      
      // Only log every 10 checks to reduce console spam
      logCounterRef.current = (logCounterRef.current + 1) % 10;
      const shouldLog = logCounterRef.current === 0;
      
      if (shouldLog) {
        console.log('[Background] Checking for task updates...');
      }
      
      // Set processing flag to prevent concurrent notification processing
      await AsyncStorage.setItem('processingNotifications', 'true');

      // Update userId state if needed
      if (!userId) {
        setUserId(userId);
      }

      // Fetch current visit locations
      const response = await axios.get(`${API_URL}/api/visit-locations/assigned/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        const newLocations = response.data.visitLocations;
        
        // Log the data we're working with
        console.log(`[Background] Current locations count: ${currentLocations.length}`);
        console.log(`[Background] New locations from API: ${newLocations.length}`);
        
        // Get current location IDs for comparison
        const currentIds = currentLocations.map(loc => loc._id);
        
        // Check for any truly new locations by comparing with what we had before
        // ONLY consider a location as new if:
        // 1. We have previously loaded locations (not first run)
        // 2. This location ID isn't in our current tracked locations
        let addedLocations = [];
        
        if (currentLocations.length > 0) {
          // We have existing locations to compare against
          addedLocations = newLocations.filter(loc => !currentIds.includes(loc._id));
          console.log(`[Background] Locations that aren't in our current list: ${addedLocations.length}`);
        } else {
          console.log(`[Background] First run, no locations to compare against`);
          // First run - don't treat any as new to avoid notification flood
          addedLocations = [];
        }
        
        // Find deleted visit locations (ones that were in the previous list but not in the new list)
        const newIds = newLocations.map(loc => loc._id);
        const deletedLocations = currentLocations.filter(loc => !newIds.includes(loc._id));
        
        // We no longer automatically notify about "new" tasks since it's causing problems
        // Instead, we'll just update our tracking state and let the UI show updates
        
        // Check if there are any tasks that our comparison logic thinks are new
        if (addedLocations.length > 0) {
          console.log(`[Background] Our comparison detected ${addedLocations.length} potentially new locations`);
          console.log(`[Background] These IDs: ${addedLocations.map(loc => loc._id).join(', ')}`);
          
          // But we'll no longer automatically notify about them - just update UI if needed
          if (addedLocations.length > 0) {
            await AsyncStorage.setItem('taskUpdated', 'true');
            await AsyncStorage.setItem('lastTaskUpdateTime', new Date().toISOString());
          }
          
          // Update our tracking to include all known task IDs to prevent future notifications
          try {
            // Get all current location IDs
            const allLocationIds = newLocations.map(loc => loc._id);
            
            // Get existing notified IDs
            const notifiedIds = await AsyncStorage.getItem('notifiedTaskIds');
            const notifiedIdsArray = notifiedIds ? JSON.parse(notifiedIds) : [];
            
            // Combine all IDs without duplicates
            const allUniqueIds = [...new Set([...notifiedIdsArray, ...allLocationIds])];
            
            // Update storage with all IDs to prevent any future notifications for existing tasks
            await AsyncStorage.setItem('notifiedTaskIds', JSON.stringify(allUniqueIds));
            
            // Update in-memory set
            setNotifiedTaskIds(new Set(allUniqueIds));
            
            console.log(`[Background] Updated tracking to include all ${allUniqueIds.length} known task IDs`);
          } catch (err) {
            console.error('[Background] Error updating notified task IDs:', err);
          }
        }
        
        // For deleted locations, we'll still track but not notify
        if (deletedLocations.length > 0) {
          console.log(`[Background] Detected ${deletedLocations.length} deleted locations`);
          await AsyncStorage.setItem('taskUpdated', 'true');
        }
        
        // Notify about deleted visit locations (only for those we haven't notified about deletion yet)
        if (deletedLocations.length > 0) {
          console.log(`[Background] Detected ${deletedLocations.length} deleted visit locations`);
          
          // Create a deletion tracking key for each location
          const deletedUniqueLocations = deletedLocations.filter(
            loc => !notifiedTaskIds.has(`deleted_${loc._id}`)
          );
          
          if (deletedUniqueLocations.length > 0) {
            console.log(`[Background] Showing notifications for ${deletedUniqueLocations.length} unique deleted locations`);
            
            // Create a new Set with existing and new deleted task IDs
            const updatedNotifiedTaskIds = new Set(notifiedTaskIds);
            
            for (const location of deletedUniqueLocations) {
              await showTaskNotification(
                'Visit Assignment Removed',
                `Visit to ${location.location?.address || 'a location'} has been removed.`,
                { type: 'visit_deletion', visitLocationId: location._id }
              );
              
              // Add this deleted task ID to our tracking set with a prefix to distinguish from additions
              updatedNotifiedTaskIds.add(`deleted_${location._id}`);
            }
            
            // Update the set of notified task IDs
            setNotifiedTaskIds(updatedNotifiedTaskIds);
            
            // Update UI by storing this information
            await AsyncStorage.setItem('taskUpdated', 'true');
            await AsyncStorage.setItem('lastTaskUpdateTime', new Date().toISOString());
          }
        }
        
        // Update the current locations reference and store in AsyncStorage
        setCurrentLocations(newLocations);
        await AsyncStorage.setItem('currentLocations', JSON.stringify(newLocations));
      }
    } catch (error) {
      console.error('[Background] Error checking for task updates:', error);
    } finally {
      // Reset processing flag when done, whether successful or not
      await AsyncStorage.setItem('processingNotifications', 'false');
    }
  };

  // Load notified task IDs and current locations from storage
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        // Load notified task IDs
        const storedTaskIds = await AsyncStorage.getItem('notifiedTaskIds');
        if (storedTaskIds) {
          // Convert the stored array back to a Set
          const parsedIds = JSON.parse(storedTaskIds);
          setNotifiedTaskIds(new Set(parsedIds));
          console.log(`[Background] Loaded ${parsedIds.length} notified task IDs from storage`);
        }
        
        // Load current locations
        const storedLocations = await AsyncStorage.getItem('currentLocations');
        if (storedLocations) {
          const parsedLocations = JSON.parse(storedLocations);
          setCurrentLocations(parsedLocations);
          console.log(`[Background] Loaded ${parsedLocations.length} locations from storage`);
        }
      } catch (error) {
        console.error('[Background] Error loading stored data:', error);
      }
    };
    
    loadStoredData();
    // No cleanup needed for this effect
  }, []);
  
  // Save notified task IDs whenever they change
  useEffect(() => {
    // Don't do anything if there are no task IDs yet
    if (notifiedTaskIds.size === 0) return;
    
    const saveNotifiedTaskIds = async () => {
      try {
        // Convert Set to Array for storage
        await AsyncStorage.setItem('notifiedTaskIds', JSON.stringify([...notifiedTaskIds]));
      } catch (error) {
        console.error('Error saving notified task IDs:', error);
      }
    };
    
    saveNotifiedTaskIds();
    // No cleanup needed for this effect
  }, [notifiedTaskIds]);

  // Set up background refresh
  useEffect(() => {
    const initialize = async () => {
      // Clear any stale processing flags
      await AsyncStorage.setItem('processingNotifications', 'false');
      
      // Load user ID
      const storedUserId = await AsyncStorage.getItem('userId');
      if (storedUserId) {
        setUserId(storedUserId);
      }
    };

    initialize();

    // DISABLED: No longer checking for task updates in the background
    // No logging needed
    // backgroundTimerRef.current = setInterval(checkForTaskUpdates, refreshInterval);
    
    // DISABLED: App state change listener that would check for task updates
    /*
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      // Update the app state reference without checking for tasks
      appState.current = nextAppState;
      setAppStateVisible(appState.current);
    });
    */

    // DISABLED: Initial check to prevent any notifications
    
    // Only clear notification state silently
    setTimeout(async () => {
      try {
        // Clear all notification flags
        await AsyncStorage.setItem('processingNotifications', 'false');
        await AsyncStorage.removeItem('notifiedTaskIds');
        await AsyncStorage.removeItem('lastNotificationCheckTime');
        await AsyncStorage.removeItem('currentLocations');
        
        // Cancel any scheduled notifications
        await Notifications.cancelAllScheduledNotificationsAsync();
      } catch (error) {
        console.error('[Background] Error clearing notification state:', error);
      }
    }, 2000);

    // Clean up on unmount - nothing to clean up since everything is disabled
    return () => {
      // No timers or listeners to clean up
    };
  }, [refreshInterval]);

  // This component doesn't render anything visible
  return null;
};

export default TaskRefreshService;