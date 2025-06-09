import { Redirect, useNavigation } from "expo-router";
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
// Import LinearGradient for the background
import { Colors } from '@/constants/Colors';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';


export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation(); // Typed navigation

  useEffect(() => {
    // Hide the header when this screen is active
    navigation.setOptions({
      headerShown: false, // Hide the header
    });

    // EMERGENCY CLEANUP: Clear all notifications immediately (silently)
    const emergencyCleanup = async () => {
      try {
        // Silently cancel all notifications
        await Notifications.cancelAllScheduledNotificationsAsync();
        await Notifications.dismissAllNotificationsAsync();
        
        // Clear all notification tracking data
        await AsyncStorage.removeItem('notifiedTaskIds');
        await AsyncStorage.removeItem('processingNotifications');
        await AsyncStorage.removeItem('lastNotificationCheckTime');
        await AsyncStorage.removeItem('currentLocations');
      } catch (error) {
        console.error('EMERGENCY CLEANUP: Failed', error);
      }
    };
    
    // Run the emergency cleanup
    emergencyCleanup();

    // Set a timeout for redirection
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    // Clean up the timer
    return () => clearTimeout(timer);
  }, [navigation]);

  if (!isLoading) {
    // Once loading is finished, redirect to the home page
    return <Redirect href="/login" />;
  }

  return (
    <View
    // Gradient colors
      style={styles.container}
    >
      {/* Replace this with your own cool graphic, logo, or animation */}
      <Image
        source={require('../assets/images/applogo.png')} // Make sure to replace with your logo path
        style={styles.logo}
      />
      <Text style={styles.appName}>{Colors.Appname}</Text>
</View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
    borderRadius:20,
  },
  appName: {
    fontSize: 40, // Larger font size for the app name
    fontFamily:'flux-bold',
    color: Colors.SECONDARY, // White color for the app name
    letterSpacing: 2, // More spaced letters for a cool effect
    textTransform: 'uppercase', // Uppercase text
  },
});
