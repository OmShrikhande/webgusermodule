import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as TaskManager from 'expo-task-manager';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

import { startBackgroundLocationTracking, checkPermissions } from '../../locationService';

export default function TabLayout() {
  useEffect(() => {
    // Start background location tracking when the app loads
    const startTracking = async () => {
      try {
        // First check if we have permissions
        const hasPermissions = await checkPermissions();
        
        if (hasPermissions) {
          await startBackgroundLocationTracking();
          console.log('Background tracking initialized in TabLayout');
        } else {
          console.warn('Location permissions not granted');
        }
      } catch (error) {
        console.error('Failed to start background location tracking:', error);
      }
    };
    
    // Start tracking immediately
    startTracking();
    
    // Also restart tracking when app comes to foreground
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        console.log('App has come to the foreground, checking tracking status');
        startTracking();
      }
    });
    
    // Cleanup
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.WHITE,
        tabBarInactiveTintColor: Colors.LIGHT_GREY,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            backgroundColor: 'transparent', // <--- ensure this is transparent
            borderTopWidth: 0, // optional: remove border
            elevation: 0, // optional: remove shadow on Android
          },
          default: {
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
          },
        }),
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
