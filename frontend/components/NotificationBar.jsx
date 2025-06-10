import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  RefreshControl,
  ActivityIndicator,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

// Get the local IP address automatically from Expo
const { debuggerHost } = Constants.expoConfig?.hostUri
  ? { debuggerHost: Constants.expoConfig.hostUri }
  : { debuggerHost: undefined };
const localIP = debuggerHost ? debuggerHost.split(':').shift() : 'localhost';
const API_URL = `http://${localIP}:5000`;

const NotificationBar = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [animatedHeight] = useState(new Animated.Value(0));

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');
      
      if (!token || !userId) {
        console.log('Authentication required to fetch notifications');
        return;
      }

      const response = await axios.get(`${API_URL}/api/notifications/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setNotifications(response.data.notifications);
        const unread = response.data.notifications.filter(item => !item.isRead).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    
    // Set up a refresh interval
    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000); // Refresh every minute
    
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (notificationId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      await axios.put(`${API_URL}/api/notifications/${notificationId}/read`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Update local state
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification._id === notificationId 
            ? { ...notification, isRead: true } 
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prevCount => Math.max(0, prevCount - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
    Animated.timing(animatedHeight, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: false
    }).start();
  };

  const getNotificationIcon = (notification) => {
    const data = notification.data || {};
    
    switch(data.type) {
      case 'login':
        return 'log-in-outline';
      case 'logout':
        return 'log-out-outline';
      case 'task_status_update':
        if (data.status === 'Completed') return 'checkmark-circle-outline';
        if (data.status === 'In Progress') return 'play-circle-outline';
        if (data.status === 'Cancelled') return 'close-circle-outline';
        return 'alert-circle-outline';
      case 'task_assignment':
        return 'clipboard-outline';
      case 'tracking_reminder':
        return 'location-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (notification) => {
    const data = notification.data || {};
    
    switch(data.type) {
      case 'login':
        return '#4CAF50'; // Green
      case 'logout':
        return '#FF5722'; // Orange
      case 'task_status_update':
        if (data.status === 'Completed') return '#4CAF50'; // Green
        if (data.status === 'In Progress') return '#2196F3'; // Blue
        if (data.status === 'Cancelled') return '#F44336'; // Red
        return '#9E9E9E'; // Grey
      case 'task_assignment':
        return '#673AB7'; // Purple
      case 'tracking_reminder':
        return '#FFC107'; // Amber
      default:
        return '#2196F3'; // Blue
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.notificationItem, !item.isRead && styles.unreadItem]}
      onPress={() => markAsRead(item._id)}
    >
      <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item) }]}>
        <Ionicons name={getNotificationIcon(item)} size={18} color="white" />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationText}>{item.message}</Text>
        <Text style={styles.notificationTime}>{formatTime(item.timestamp)}</Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const maxHeight = Math.min(400, notifications.length * 70 + 50);
  const heightInterpolation = animatedHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, maxHeight]
  });

  return (
    <View style={styles.container}>
      {/* Notification Bar Header */}
      <TouchableOpacity style={styles.header} onPress={toggleExpanded}>
        <View style={styles.headerContent}>
          <Ionicons name="notifications" size={24} color="#2196F3" />
          <Text style={styles.headerText}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <Ionicons 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#757575" 
        />
      </TouchableOpacity>
      
      {/* Notifications List */}
      <Animated.View style={[styles.notificationsContainer, { height: heightInterpolation }]}>
        {loading && !refreshing ? (
          <ActivityIndicator size="small" color="#2196F3" style={styles.loader} />
        ) : notifications.length > 0 ? (
          <FlatList
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={item => item._id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchNotifications();
                }}
                colors={["#2196F3"]}
              />
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={24} color="#9E9E9E" />
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
    overflow: 'hidden',
  },
  header: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  badge: {
    backgroundColor: '#f44336',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notificationsContainer: {
    overflow: 'hidden',
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  unreadItem: {
    backgroundColor: '#f5f9ff',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#757575',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
    marginLeft: 8,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9E9E9E',
    marginTop: 8,
  },
  loader: {
    padding: 20,
  },
});

export default NotificationBar;