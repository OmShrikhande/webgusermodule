import React, { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert, Animated, Dimensions, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import NotificationPopup from '../../components/NotificationPopup';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { useFocusEffect } from 'expo-router';
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

// Define background location task
// In TaskManager.defineTask
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const userId = await AsyncStorage.getItem('userId'); // <-- get userId
    if (!userId) {
      console.warn('No userId found in storage');
      return;
    }
    const location = locations[0];
    fetch(`${API_URL}/api/store-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
      }),
    });
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

  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: 'Fix navigation bug',
      assignedTo: 'You',
      dueDate: '2023-06-08',
      status: 'In Progress',
    },
    {
      id: 2,
      title: 'Create user dashboard',
      assignedTo: 'Alice Smith',
      dueDate: '2023-06-12',
      status: 'Pending',
    },
    {
      id: 3,
      title: 'Update API documentation',
      assignedTo: 'You',
      dueDate: '2023-06-09',
      status: 'In Progress',
    },
  ]);

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

  // Focus effect to refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchUserProfile();
      
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
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserProfile();
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
          timeInterval: 60000, // Update every minute
          foregroundService: {
            notificationTitle: 'Attendance Tracking',
            notificationBody: 'Monitoring your location for attendance.',
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
            '${API_URL}/api/store-location',
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
          
          // Check for geofence breach based on server response
          if (!isInOffice) {
            // Set alert message and distance for the notification popup
            const message = `You are ${Math.round(distance)}m away from the office. Please return to the office area.`;
            setAlertMessage(message);
            setAlertDistance(Math.round(distance));
            setNotificationVisible(true);
            
            // Only save alert if user just crossed the boundary (was in office before)
            if (wasInOffice) {
              try {
                // Call the alert-out-of-range endpoint to save the alert
                await axios.post(
                  '${API_URL}/api/alert-out-of-range',
                  {
                    userId,
                    location: { latitude, longitude },
                  },
                  {
                    headers: { Authorization: `Bearer ${token}` },
                  }
                );
                console.log('Geofence crossing alert saved to database');
              } catch (alertErr) {
                console.error('Failed to save geofence alert:', alertErr);
              }
            }
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
  }, 60000); // Check every minute

  return () => clearInterval(interval);
}, []);

  const getStatusColor = (status) => {
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

  // Get the local IP address automatically from Expo
const { debuggerHost } = Constants.expoConfig?.hostUri
  ? { debuggerHost: Constants.expoConfig.hostUri }
  : { debuggerHost: undefined };
const localIP = debuggerHost ? debuggerHost.split(':').shift() : 'localhost';
const API_URL = `http://${localIP}:5000`;

  if (!userData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Notification Popup */}
      <NotificationPopup
        visible={notificationVisible}
        onClose={() => setNotificationVisible(false)}
        message={alertMessage}
        distance={alertDistance}
      />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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
        <QuickStats userData={userData} deadlines={deadlines} styles={styles} />

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
        <UpcomingDeadlines deadlines={deadlines} styles={styles} getPriorityColor={getPriorityColor} />

        {/* Assigned Tasks */}
        <AssignedTasks tasks={tasks} styles={styles} />

        {/* Recent Activity */}
        <RecentActivity timeline={timeline} styles={styles} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.GRAY,
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
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
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
});

export default Home;