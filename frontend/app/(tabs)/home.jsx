import React, { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert, Animated, Dimensions, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import NotificationPopup from '../../components/NotificationPopup';
import { setupLocalNotifications } from '../../notificationService';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '@/constants/Colors';
import { useFocusEffect, router } from 'expo-router';
import UserHeader from '../../components/home/UserHeader';
import AttendanceCard from '../../components/home/AttendanceCard';
import QuickStats from '../../components/home/QuickStats';
import UpcomingDeadlines from '../../components/home/UpcomingDeadlines';
import AssignedTasks from '../../components/home/AssignedTasks';
import RecentActivity from '../../components/home/RecentActivity';
import Constants from 'expo-constants';

const LOCATION_TASK_NAME = 'background-location-task';
const OFFICE_LOCATION = {
  latitude: 21.12354197063915,
  longitude: 79.039775255145,
};
const MAX_DISTANCE = 50;

// Haversine formula to calculate distance in meters
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Import API_URL from constants.js
import { API_URL } from '../../constants';

// Now define TaskManager task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) {
      console.warn('No userId found in storage');
      return;
    }
    const location = locations[0];
    const userLocation = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    
    // Store location for attendance tracking
    fetch(`${API_URL}/api/store-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        location: userLocation,
      }),
    });
    
    // Check for visit location auto-completion in background
    try {
      const token = await AsyncStorage.getItem('token');
      if (token && userId) {
        console.log('Background check - Token exists:', !!token, 'UserId:', userId);
        
        // First test if token is valid
        const testResponse = await fetch(`${API_URL}/api/test-auth`, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (testResponse.ok) {
          // Token is valid, proceed with visit location check
          const response = await fetch(`${API_URL}/api/check-visit-locations`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              userId,
              location: userLocation,
            }),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Background visit check failed:', response.status, response.statusText, errorText);
          } else {
            const data = await response.json();
            console.log('Background visit check result:', data);
          }
        } else {
          console.error('Background check - Token validation failed:', testResponse.status);
        }
      } else {
        console.warn('Background check skipped - missing token or userId');
      }
    } catch (err) {
      console.error('Background visit check error:', err);
    }
  }
});

const { width } = Dimensions.get('window');

const Home = () => {
  // Add state to track if user was previously in office
  const [wasInOffice, setWasInOffice] = useState(true);
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertDistance, setAlertDistance] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Real user data from backend
  const [userData, setUserData] = useState(null);
  const [latestAttendance, setLatestAttendance] = useState(null);
  
  // Notification state
  const [unreadTasksCount, setUnreadTasksCount] = useState(0);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [teamData, setTeamData] = useState([
    {
      id: 1,
      name: 'Alice Smith',
      status: 'Present',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    },
    {
      id: 2,
      name: 'Bob Johnson',
      status: 'On Leave',
      avatar: 'https://randomuser.me/api/portraits/men/46.jpg',
    },
    {
      id: 3,
      name: 'Carol Williams',
      status: 'Half Day',
      avatar: 'https://randomuser.me/api/portraits/women/63.jpg',
    },
    {
      id: 4,
      name: 'David Brown',
      status: 'Absent',
      avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
    },
    {
      id: 5,
      name: 'Eva Davis',
      status: 'Present',
      avatar: 'https://randomuser.me/api/portraits/women/14.jpg',
    },
  ]);

  const [deadlines, setDeadlines] = useState([
    { id: 1, title: 'Project Alpha Delivery', date: '2023-06-15', priority: 'High' },
    { id: 2, title: 'Client Meeting', date: '2023-06-10', priority: 'Medium' },
    { id: 3, title: 'Quarterly Report', date: '2023-06-30', priority: 'Low' },
  ]);

  const [visitLocations, setVisitLocations] = useState([]);

  const [products, setProducts] = useState([
    {
      id: 1,
      name: 'Product A',
      image: 'https://via.placeholder.com/100',
      status: 'Active',
    },
    {
      id: 2,
      name: 'Product B',
      image: 'https://via.placeholder.com/100',
      status: 'In Development',
    },
    {
      id: 3,
      name: 'Product C',
      image: 'https://via.placeholder.com/100',
      status: 'Planned',
    },
  ]);

  const [timeline, setTimeline] = useState([
    {
      id: 1,
      user: 'Alice Smith',
      action: 'completed task',
      item: 'Homepage redesign',
      time: '2 hours ago',
    },
    {
      id: 2,
      user: 'You',
      action: 'were assigned',
      item: 'API integration',
      time: '4 hours ago',
    },
    {
      id: 3,
      user: 'Bob Johnson',
      action: 'commented on',
      item: 'Database schema',
      time: '1 day ago',
    },
    {
      id: 4,
      user: 'Carol Williams',
      action: 'updated',
      item: 'Project timeline',
      time: '2 days ago',
    },
  ]);

  // Fetch user profile data
  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${API_URL}/api/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setUserData(response.data.user);
        setLatestAttendance(response.data.latestAttendance);
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch unread visit locations count
  const fetchUnreadTasksCount = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');
      
      if (!token || !userId) return;

      const response = await axios.get(`${API_URL}/api/visit-locations/unread-count/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setUnreadTasksCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread visit locations count:', error);
    }
  };

  // Helper function to show task notifications
  const showTaskNotification = async (title, body, data = {}) => {
    try {
      // Ensure we have notification permissions
      const permissionGranted = await setupLocalNotifications();
      if (!permissionGranted) return;
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error showing task notification:', error);
    }
  };

  // Fetch visit locations
  const fetchVisitLocations = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');
      
      if (!token || !userId) return;

      const response = await axios.get(`${API_URL}/api/visit-locations/assigned/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        // Check for new visit locations
        const currentLocations = visitLocations || [];
        const currentIds = currentLocations.map(loc => loc._id);
        const newLocations = response.data.visitLocations.filter(loc => !currentIds.includes(loc._id));
        
        // Show notifications for new visit locations
        if (newLocations.length > 0) {
          console.log(`Found ${newLocations.length} new visit locations`);
          
          // Show a notification for each new location
          for (const location of newLocations) {
            await showTaskNotification(
              'New Visit Location',
              `You have been assigned to visit: ${location.location?.address || 'New location'}`,
              { type: 'new_task', taskId: location._id }
            );
          }
        }
        
        setVisitLocations(response.data.visitLocations);
      }
    } catch (error) {
      console.error('Error fetching visit locations:', error);
    }
  };

  // Validate token before making requests
  const validateToken = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn('No token found in storage');
        return null;
      }

      // Test the token with a simple endpoint
      const response = await axios.get(`${API_URL}/api/test-auth`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        console.log('Token validation successful');
        return token;
      } else {
        console.error('Token validation failed');
        return null;
      }
    } catch (error) {
      console.error('Token validation error:', error.response?.status, error.response?.data);
      if (error.response?.status === 403) {
        console.error('Token expired or invalid - user may need to re-login');
        // Clear invalid token
        await AsyncStorage.removeItem('token');
        // Optionally redirect to login
        // router.replace('/login');
      }
      return null;
    }
  };

  // Check and auto-complete visit locations based on user proximity
  const checkVisitLocations = async (userId, userLocation, token) => {
    try {
      // Add validation before making the request
      if (!userId || !token) {
        console.warn('Missing userId or token for visit location check');
        return;
      }

      if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
        console.warn('Invalid user location for visit location check');
        return;
      }

      console.log('Checking visit locations with:', { 
        userId, 
        location: userLocation, 
        tokenExists: !!token,
        tokenLength: token ? token.length : 0
      });

      const response = await axios.post(
        `${API_URL}/api/check-visit-locations`,
        {
          userId,
          location: userLocation,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        const { completedVisits, autoStartedVisits } = response.data;
        
        // Show notifications for auto-completed visits
        if (completedVisits.length > 0) {
          const completedMessage = completedVisits.length === 1 
            ? `✅ Visit to "${completedVisits[0].address}" completed automatically! Distance: ${completedVisits[0].distance}m`
            : `✅ ${completedVisits.length} visits completed automatically!`;
          
          setAlertMessage(completedMessage);
          setNotificationVisible(true);
          
          completedVisits.forEach(visit => {
            console.log(`Auto-completed visit: ${visit.address} (${visit.distance}m)`);
          });
          
          // Refresh visit locations to update the UI
          fetchVisitLocations();
          fetchUnreadTasksCount();
        }

        // Show notifications for auto-started visits
        if (autoStartedVisits.length > 0) {
          const startedMessage = autoStartedVisits.length === 1 
            ? `🚀 Visit to "${autoStartedVisits[0].address}" started automatically! Distance: ${autoStartedVisits[0].distance}m`
            : `🚀 ${autoStartedVisits.length} visits started automatically!`;
          
          // Only show start notification if no completion notification
          if (completedVisits.length === 0) {
            setAlertMessage(startedMessage);
            setNotificationVisible(true);
          }
          
          autoStartedVisits.forEach(visit => {
            console.log(`Auto-started visit: ${visit.address} (${visit.distance}m)`);
          });
          
          // Refresh visit locations to update the UI
          fetchVisitLocations();
        }
      }
    } catch (error) {
      console.error('Error checking visit locations:', error);
      
      // Detailed error logging
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        console.error('Response headers:', error.response.headers);
        
        if (error.response.status === 403) {
          console.error('Authentication failed - token may be invalid or expired');
          // Optionally refresh token or redirect to login
        }
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
    }
  };

  // Handle notification bell press
  const handleNotificationPress = () => {
    router.push('/notifications');
  };

  // Focus effect to refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Initial data fetch
      fetchUserProfile();
      fetchUnreadTasksCount();
      fetchVisitLocations();
      
      // Set up polling for automatic updates (every 30 seconds)
      const pollingInterval = setInterval(() => {
        console.log('Auto-refreshing visit locations data...');
        fetchUnreadTasksCount();
        fetchVisitLocations();
      }, 30000);
      
      // Start entrance animations
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
      
      // Clean up interval when screen loses focus
      return () => clearInterval(pollingInterval);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserProfile();
    fetchUnreadTasksCount();
    fetchVisitLocations();
  };

  useEffect(() => {
    // Request background location permissions
    const startLocationTracking = async () => {
      try {
        // Initialize wasInOffice in AsyncStorage (default to true)
        await AsyncStorage.setItem('wasInOffice', 'true');
        
        let { status } = await Location.requestBackgroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Denied',
            'Background location permission is required for geofencing.'
          );
          return;
        }

        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // Update every 10 meters
          timeInterval: 30000, // Update every 30 seconds
          foregroundService: {
            notificationTitle: 'Location Tracking',
            notificationBody: 'Monitoring your location for attendance and visit completion.',
          },
        });
      } catch (error) {
        console.error('Error starting location tracking:', error);
      }
    };

    startLocationTracking();

    // Cleanup on unmount
    return () => {
      Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch((err) =>
        console.error('Error stopping location updates:', err)
      );
    };
  }, []);

  // Check location periodically in foreground
  useEffect(() => {
  const interval = setInterval(async () => {
    try {
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude,
      longitude } = location.coords;
      const distance = calculateDistance(
        latitude,
        longitude,
        OFFICE_LOCATION.latitude,
        OFFICE_LOCATION.longitude
      );

      // Get userId and token for logging and API call
      const userId = await AsyncStorage.getItem('userId');
      const token = await AsyncStorage.getItem('token');
      
      // Add logging to verify location data
      console.log('Foreground location:', { userId, latitude, longitude, distance });
      if (token && userId) {
        try {
          const response = await axios.post(
            `${API_URL}/api/store-location`,
            {
              userId,
              location: { latitude, longitude },
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          
          // Get the isInOffice status from the response
          const { isInOffice, distance: serverDistance } = response.data;
          
          console.log('Foreground location sent to backend', { 
            isInOffice, 
            distance: serverDistance,
            clientDistance: Math.round(distance)
          });
          
          // Check for visit location auto-completion
          try {
            const validToken = await validateToken();
            if (validToken) {
              await checkVisitLocations(userId, { latitude, longitude }, validToken);
            } else {
              console.warn('Skipping visit location check - invalid token');
            }
          } catch (visitError) {
            console.error('Visit location check failed:', visitError);
          }
          
          // Check for geofence breach based on server response
          const notificationsEnabled = (await AsyncStorage.getItem('notificationsEnabled')) === 'true';

          if (!isInOffice && notificationsEnabled) {
            // Set alert message and distance for the notification popup
            const message = `You are ${Math.round(distance)}m away from the office. Please return to the office area.`;
            setAlertMessage(message);
            setAlertDistance(Math.round(distance));
            setNotificationVisible(true);
          }
          
          // Update the wasInOffice state for next check
          setWasInOffice(isInOffice);
        } catch (err) {
          console.error('Foreground store-location error:', err.message);
        }
      } else {
        console.warn('Foreground: Missing token or userId');
      }
    } catch (error) {
      console.error('Foreground location error:', error);
    }
  }, 30000); // Check every 30 seconds for better responsiveness

  return () => clearInterval(interval);
}, []);

const getStatusColor = (status) => {
  if (!status || typeof status !== 'string') return '#9E9E9E';
  switch (status.toLowerCase()) {
    case 'present':
      return '#4CAF50';
    case 'absent':
      return '#F44336';
    case 'on leave':
      return '#2196F3';
    case 'half day':
      return '#FF9800';
    default:
      return '#9E9E9E';
  }
};

const getPriorityColor = (priority) => {
  if (!priority || typeof priority !== 'string') return '#9E9E9E';
  switch (priority.toLowerCase()) {
    case 'high':
      return '#F44336';
    case 'medium':
      return '#FF9800';
    case 'low':
      return '#4CAF50';
    default:
      return '#9E9E9E';
  }
};

  const formatTime = (dateString) => {
    if (!dateString) return 'Not available';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getInitials = (name, email) => {
    if (name && name.trim()) {
      return name.trim().charAt(0).toUpperCase();
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getImageUri = (profileImage) => {
    if (!profileImage) return null;
    
    // If it's already a full URL or base64, return as is
    if (profileImage.startsWith('http') || profileImage.startsWith('data:')) {
      return profileImage;
    }
    
    // If it's a relative path, prepend the server URL
    if (profileImage.startsWith('/uploads/')) {
      return `${API_URL}${profileImage}`;
    }
    
    return profileImage;
  };

  if (!userData) {
    return (
      <LinearGradient
        colors={[Colors.PRIMARY, Colors.SECONDARY]}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Filter completed and pending
  const completedTasks = visitLocations.filter(v => v.visitStatus === 'completed');
  const pendingTasks = visitLocations.filter(v => v.visitStatus !== 'completed');

  const recentCompletedTasks = completedTasks
  .sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate))
  .slice(0, 3)
  .map((task, idx) => ({
    id: task._id || idx,
    user: userData?.name || 'You',
    action: 'completed',
    item: task.address || task.title || 'Task',
    time: task.visitDate ? new Date(task.visitDate).toLocaleString() : '',
  }));

  return (
    <LinearGradient
      colors={[Colors.PRIMARY, Colors.SECONDARY]}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView 
      showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        {/* Notification Popup */}
        <NotificationPopup
          visible={notificationVisible}
          onClose={() => setNotificationVisible(false)}
          message={alertMessage}
          distance={alertDistance}
        />
      

        
          
          {/* Enhanced Header with user info */}
          <Animated.View 
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <UserHeader
              userData={userData}
              latestAttendance={latestAttendance}
              fadeAnim={fadeAnim}
              slideAnim={slideAnim}
              getImageUri={getImageUri}
              getInitials={getInitials}
              Colors={Colors}
              styles={styles}
              onNotificationPress={handleNotificationPress}
              unreadTasksCount={unreadTasksCount}
            />
          </Animated.View>

          {/* Attendance Times Card */}
          {latestAttendance && (
            <Animated.View 
              style={[
                styles.attendanceCard,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <AttendanceCard
                latestAttendance={latestAttendance}
                fadeAnim={fadeAnim}
                slideAnim={slideAnim}
                formatTime={formatTime}
                Colors={Colors}
                styles={styles}
              />
            </Animated.View>
          )}

          {/* Quick Stats */}
          <QuickStats
            userData={userData}
            deadlines={pendingTasks} // Use pendingTasks for real pending deadlines
            styles={styles}
            completedTasksCount={completedTasks.length}
            totalTasksCount={visitLocations.length}
          />

          {/* Navigation Options */}
          <View style={styles.navigationContainer}>
            <TouchableOpacity style={styles.navButton}>
              <Ionicons name="calendar" size={24} color="#4CAF50" />
              <Text style={styles.navButtonText}>Calendar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton}>
              <Ionicons name="people" size={24} color="#2196F3" />
              <Text style={styles.navButtonText}>Team</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton}>
              <Ionicons name="document-text" size={24} color="#FF9800" />
              <Text style={styles.navButtonText}>Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton}>
              <Ionicons name="settings" size={24} color="#9E9E9E" />
              <Text style={styles.navButtonText}>Settings</Text>
            </TouchableOpacity>
          </View>

          {/* Upcoming Deadlines */}
          <UpcomingDeadlines deadlines={pendingTasks} styles={styles} getPriorityColor={getPriorityColor} />

          {/* Assigned Tasks */}
          <AssignedTasks 
            visitLocations={completedTasks} 
            styles={styles} 
            onSeeAllPress={handleNotificationPress}
            showCount // Add this prop if your component supports showing count
          />

          {/* Recent Activity */}
          <RecentActivity timeline={recentCompletedTasks} styles={styles} />
      
      </SafeAreaView>
        </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // was '#f5f7fa'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent', // remove solid color
  },
  header: {
    marginBottom: 20,
  },
  headerGradient: {
    padding: 20,
    paddingTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCount: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  attendanceCard: {
    marginHorizontal: 15,
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  attendanceGradient: {
    padding: 20,
  },
  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  attendanceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.PRIMARY,
    marginLeft: 10,
  },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendanceItem: {
    alignItems: 'center',
    flex: 1,
  },
  attendanceDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    marginHorizontal: 20,
  },
  attendanceLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  attendanceTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  attendanceTimeInactive: {
    color: '#999',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.85)', // or 'transparent' for full gradient
    borderRadius: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  navButton: {
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 12,
    color: '#333',
    marginTop: 4,
  },
  sectionContainer: {
    backgroundColor: 'rgba(255,255,255,0.85)', // or 'transparent'
    borderRadius: 8,
    padding: 16,
    margin: 16,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#2196F3',
  },
  deadlineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  deadlineInfo: {
    flex: 1,
  },
  deadlineTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  deadlineDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  taskAssignee: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  taskDueDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  taskStatusContainer: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  taskStatus: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '500',
  },
  teamContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  teamMember: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  teamMemberAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  teamMemberName: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  teamMemberStatus: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  teamMemberStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  productsContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  productCard: {
    width: 120,
    marginRight: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 8,
  },
  productImage: {
    width: '100%',
    height: 80,
    borderRadius: 4,
    marginBottom: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  productStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2196F3',
    marginRight: 12,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  timelineUser: {
    fontWeight: '500',
  },
  timelineItem: {
    fontWeight: '500',
  },
  timelineTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  adminNotes: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyTasksContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyTasksText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default Home;