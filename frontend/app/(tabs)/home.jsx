import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

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
    fetch('http://192.168.43.196:5000/api/store-location', {
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

const Home = () => {
  const [userData, setUserData] = useState({
    name: 'John Doe',
    role: 'Software Developer',
    status: 'Present',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    notifications: 5,
    tasks: 8,
    completedTasks: 3,
  });

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

  useEffect(() => {
    // Request background location permissions
    const startLocationTracking = async () => {
      try {
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

      // Add logging to verify location data
      console.log('Foreground location:', { userId, latitude, longitude, distance });

      // Send location to backend
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');
      if (token && userId) {
        await axios.post(
          'http://192.168.1.57:5000/api/store-location',
          {
            userId,
            location: { latitude, longitude },
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ).then(() => console.log('Foreground location sent to backend'))
         .catch(err => console.error('Foreground store-location error:', err.message));
      } else {
        console.warn('Foreground: Missing token or userId');
      }

      // Check for geofence breach
      if (distance > MAX_DISTANCE) {
        Alert.alert(
          'Geofence Alert',
          `You are ${Math.round(distance)}m away from the office. Please return to the office area.`,
          [{ text: 'OK' }]
        );
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with user info */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Image source={{ uri: userData.avatar }} style={styles.avatar} />
            <View>
              <Text style={styles.userName}>Welcome, {userData.name}</Text>
              <Text style={styles.userRole}>{userData.role}</Text>
              <View style={styles.statusContainer}>
                <View
                  style={[
                    styles.statusIndicator,
                    { backgroundColor: getStatusColor(userData.status) },
                  ]}
                />
                <Text style={styles.statusText}>{userData.status}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications" size={24} color="#333" />
            {userData.notifications > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationCount}>
                  {userData.notifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{userData.tasks}</Text>
            <Text style={styles.statLabel}>Tasks</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{userData.completedTasks}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{deadlines.length}</Text>
            <Text style={styles.statLabel}>Deadlines</Text>
          </View>
        </View>

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
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Deadlines</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {deadlines.map((deadline) => (
            <View key={deadline.id} style={styles.deadlineItem}>
              <View style={styles.deadlineInfo}>
                <Text style={styles.deadlineTitle}>{deadline.title}</Text>
                <Text style={styles.deadlineDate}>Due: {deadline.date}</Text>
              </View>
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor(deadline.priority) },
                ]}
              >
                <Text style={styles.priorityText}>{deadline.priority}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Assigned Tasks */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Assigned Tasks</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {tasks.map((task) => (
            <View key={task.id} style={styles.taskItem}>
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskAssignee}>
                  Assigned to: {task.assignedTo}
                </Text>
                <Text style={styles.taskDueDate}>Due: {task.dueDate}</Text>
              </View>
              <View style={styles.taskStatusContainer}>
                <Text style={styles.taskStatus}>{task.status}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Team Status */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Team Status</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.teamContainer}
          >
            {teamData.map((member) => (
              <View key={member.id} style={styles.teamMember}>
                <Image
                  source={{ uri: member.avatar }}
                  style={styles.teamMemberAvatar}
                />
                <Text style={styles.teamMemberName}>{member.name}</Text>
                <View
                  style={[
                    styles.teamMemberStatus,
                    { backgroundColor: getStatusColor(member.status) },
                  ]}
                >
                  <Text style={styles.teamMemberStatusText}>{member.status}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Product Showcase */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Products</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.productsContainer}
          >
            {products.map((product) => (
              <TouchableOpacity key={product.id} style={styles.productCard}>
                <Image
                  source={{ uri: product.image }}
                  style={styles.productImage}
                />
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productStatus}>{product.status}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Timeline / Activity Feed */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {timeline.map((activity) => (
            <View key={activity.id} style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineText}>
                  <Text style={styles.timelineUser}>{activity.user}</Text>{' '}
                  {activity.action}{' '}
                  <Text style={styles.timelineItem}>{activity.item}</Text>
                </Text>
                <Text style={styles.timelineTime}>{activity.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#F44336',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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