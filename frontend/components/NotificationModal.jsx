import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  RefreshControl,
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

const NotificationModal = ({ visible, onClose }) => {
  const [visitLocations, setVisitLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchVisitLocations();
    }
  }, [visible]);

  const fetchVisitLocations = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');
      
      if (!token || !userId) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      const response = await axios.get(`${API_URL}/api/visit-locations/assigned/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setVisitLocations(response.data.visitLocations);
      }
    } catch (error) {
      console.error('Error fetching visit locations:', error);
      Alert.alert('Error', 'Failed to fetch visit locations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markVisitLocationAsRead = async (visitLocationId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      await axios.put(`${API_URL}/api/visit-locations/${visitLocationId}/read`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Update local state
      setVisitLocations(prevLocations =>
        prevLocations.map(location =>
          location._id === visitLocationId ? { ...location, isRead: true } : location
        )
      );
    } catch (error) {
      console.error('Error marking visit location as read:', error);
    }
  };

  const updateVisitLocationStatus = async (visitLocationId, newStatus, userFeedback = '') => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      const response = await axios.put(`${API_URL}/api/visit-locations/${visitLocationId}/status`, 
        { visitStatus: newStatus, userFeedback },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        // Update local state
        setVisitLocations(prevLocations =>
          prevLocations.map(location =>
            location._id === visitLocationId ? { ...location, visitStatus: newStatus, userFeedback } : location
          )
        );
        Alert.alert('Success', `Visit status updated to ${newStatus}`);
      }
    } catch (error) {
      console.error('Error updating visit location status:', error);
      Alert.alert('Error', 'Failed to update visit location status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FF9800';
      case 'in-progress':
        return '#2196F3';
      case 'completed':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getUrgencyColor = (visitDate) => {
    if (!visitDate) return '#9E9E9E';
    
    const today = new Date();
    const visit = new Date(visitDate);
    const diffTime = visit - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return '#F44336'; // Overdue
    if (diffDays <= 1) return '#FF9800'; // Due soon
    if (diffDays <= 3) return '#FFC107'; // Due this week
    return '#4CAF50'; // Future
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchVisitLocations();
  };

  const renderVisitLocationItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.taskItem, !item.isRead && styles.unreadTask]}
      onPress={() => markVisitLocationAsRead(item._id)}
    >
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>Visit Location</Text>
        <View style={styles.priorityBadge}>
          <Text style={[styles.priorityText, { color: getUrgencyColor(item.visitDate) }]}>
            {item.visitDate ? 'Scheduled' : 'Pending'}
          </Text>
        </View>
      </View>
      
      <Text style={styles.taskDescription}>{item.location?.address}</Text>
      
      {item.adminNotes && (
        <Text style={styles.adminNotes}>
          Admin Notes: {item.adminNotes}
        </Text>
      )}
      
      <View style={styles.taskDetails}>
        <Text style={styles.assignedBy}>
          Assigned by: Admin
        </Text>
        {item.visitDate && (
          <Text style={styles.dueDate}>
            Visit Date: {formatDate(item.visitDate)}
          </Text>
        )}
        <Text style={styles.notificationTime}>
          Assigned: {formatDate(item.notificationTime)}
        </Text>
      </View>
      
      <View style={styles.taskFooter}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.visitStatus) }]}>
          <Text style={styles.statusText}>{item.visitStatus}</Text>
        </View>
        
        {item.visitStatus !== 'completed' && item.visitStatus !== 'cancelled' && (
          <View style={styles.actionButtons}>
            {item.visitStatus === 'pending' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.startButton]}
                onPress={() => updateVisitLocationStatus(item._id, 'in-progress')}
              >
                <Text style={styles.actionButtonText}>Start Visit</Text>
              </TouchableOpacity>
            )}
            
            {item.visitStatus === 'in-progress' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={() => updateVisitLocationStatus(item._id, 'completed')}
              >
                <Text style={styles.actionButtonText}>Complete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      
      {!item.isRead && <View style={styles.unreadIndicator} />}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Visit Locations</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={visitLocations}
          renderItem={renderVisitLocationItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No visit locations assigned</Text>
            </View>
          }
        />
      </View>
    </Modal>
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
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  listContainer: {
    padding: 15,
  },
  taskItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
  },
  unreadTask: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  adminNotes: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  taskDetails: {
    marginBottom: 10,
  },
  assignedBy: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  dueDate: {
    fontSize: 12,
    color: '#888',
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  startButton: {
    backgroundColor: '#2196F3',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
});

export default NotificationModal;