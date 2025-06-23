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
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { setupLocalNotifications } from '../notificationService';
import { API_URL } from '../constants';

// API_URL is now imported from constants.js

const NotificationPage = ({ visible, onClose }) => {
  const [visitLocations, setVisitLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchVisitLocations();
      
      // Set up polling for new tasks every 30 seconds when the page is visible
      const pollingInterval = setInterval(() => {
        fetchVisitLocations();
      }, 30000);
      
      // Clean up the interval when the component is hidden
      return () => clearInterval(pollingInterval);
    }
  }, [visible]);

  useEffect(() => {
    // Filter locations based on search query
    if (searchQuery.trim() === '') {
      setFilteredLocations(visitLocations);
    } else {
      const filtered = visitLocations.filter(location =>
        location.location?.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.adminNotes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.visitStatus?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredLocations(filtered);
    }
  }, [searchQuery, visitLocations]);

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

  const fetchVisitLocations = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');
      
      if (!token || !userId) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      const response = await axios.get(`https://webgusermodule.onrender.com//api/visit-locations/assigned/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        // Compare with current tasks to identify new ones
        const currentIds = visitLocations.map(loc => loc._id);
        const newLocations = response.data.visitLocations.filter(loc => !currentIds.includes(loc._id));
        
        // Notify for new tasks
        if (newLocations.length > 0) {
          // Show a notification for each new task
          for (const location of newLocations) {
            showTaskNotification(
              'New Visit Location',
              `You have been assigned to: ${location.location?.address || 'New location'}`,
              { type: 'new_task', taskId: location._id }
            );
          }
        }
        
        setVisitLocations(response.data.visitLocations);
        setFilteredLocations(response.data.visitLocations);
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
      
      await axios.put(`https://webgusermodule.onrender.com//api/visit-locations/${visitLocationId}/read`, {}, {
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
      
      const response = await axios.put(`https://webgusermodule.onrender.com//api/visit-locations/${visitLocationId}/status`, 
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
        
        // Update selected location if it's the same
        if (selectedLocation && selectedLocation._id === visitLocationId) {
          setSelectedLocation(prev => ({ ...prev, visitStatus: newStatus, userFeedback }));
        }
        
        Alert.alert('Success', `Visit status updated to ${newStatus}`);
        
        // Show system notification based on status
        const location = visitLocations.find(loc => loc._id === visitLocationId);
        const address = location?.location?.address || 'Location';
        
        let notificationTitle = 'Visit Status Updated';
        let notificationBody = `Visit to ${address} `;
        
        switch(newStatus) {
          case 'in-progress':
            notificationTitle = 'Visit Started';
            notificationBody += 'has been started';
            break;
          case 'completed':
            notificationTitle = 'Visit Completed';
            notificationBody += 'has been completed';
            break;
          case 'cancelled':
            notificationTitle = 'Visit Cancelled';
            notificationBody += 'has been cancelled';
            break;
          default:
            notificationBody += `status changed to ${newStatus}`;
        }
        
        showTaskNotification(
          notificationTitle, 
          notificationBody,
          { type: 'task_status_update', taskId: visitLocationId, status: newStatus }
        );
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
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchVisitLocations();
  };

  const handleCardPress = (location) => {
    setSelectedLocation(location);
    setShowDetails(true);
    markVisitLocationAsRead(location._id);
  };

  const handleBackToList = () => {
    setShowDetails(false);
    setSelectedLocation(null);
  };

  const renderLocationCard = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, !item.isRead && styles.unreadCard]}
      onPress={() => handleCardPress(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Ionicons name="location" size={20} color="#2196F3" />
          <Text style={styles.cardTitle}>Visit Location</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.visitStatus) }]}>
          <Text style={styles.statusText}>{item.visitStatus}</Text>
        </View>
      </View>
      
      <Text style={styles.cardAddress} numberOfLines={2}>
        {item.location?.address || 'No address provided'}
      </Text>
      
      {item.adminNotes && (
        <Text style={styles.cardNotes} numberOfLines={1}>
          Notes: {item.adminNotes}
        </Text>
      )}
      
      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>
          {item.visitDate ? `Visit: ${formatDate(item.visitDate)}` : 'No date set'}
        </Text>
        <Text style={styles.cardAssigned}>
          Assigned: {formatDate(item.notificationTime)}
        </Text>
      </View>
      
      {!item.isRead && <View style={styles.unreadIndicator} />}
    </TouchableOpacity>
  );

  const renderDetailView = () => (
    <ScrollView style={styles.detailContainer}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={handleBackToList} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.detailTitle}>Visit Details</Text>
        <View style={styles.placeholder} />
      </View>
      
      <View style={styles.detailCard}>
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Location Information</Text>
          <View style={styles.detailRow}>
            <Ionicons name="location" size={20} color="#2196F3" />
            <Text style={styles.detailText}>{selectedLocation?.location?.address}</Text>
          </View>
          {selectedLocation?.location?.latitude && selectedLocation?.location?.longitude && (
            <View style={styles.detailRow}>
              <Ionicons name="map" size={20} color="#2196F3" />
              <Text style={styles.detailText}>
                Lat: {selectedLocation.location.latitude}, Lng: {selectedLocation.location.longitude}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Visit Information</Text>
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={20} color="#FF9800" />
            <Text style={styles.detailText}>
              {selectedLocation?.visitDate ? formatDate(selectedLocation.visitDate) : 'No date scheduled'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="flag" size={20} color={getStatusColor(selectedLocation?.visitStatus)} />
            <Text style={[styles.detailText, { color: getStatusColor(selectedLocation?.visitStatus) }]}>
              Status: {selectedLocation?.visitStatus}
            </Text>
          </View>
        </View>
        
        {selectedLocation?.adminNotes && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Admin Notes</Text>
            <Text style={styles.detailNotes}>{selectedLocation.adminNotes}</Text>
          </View>
        )}
        
        {selectedLocation?.userFeedback && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Your Feedback</Text>
            <Text style={styles.detailNotes}>{selectedLocation.userFeedback}</Text>
          </View>
        )}
        
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Timeline</Text>
          <View style={styles.timelineItem}>
            <View style={styles.timelineDot} />
            <Text style={styles.timelineText}>
              Assigned: {formatDate(selectedLocation?.notificationTime)}
            </Text>
          </View>
          {selectedLocation?.visitDate && (
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.timelineText}>
                Scheduled: {formatDate(selectedLocation.visitDate)}
              </Text>
            </View>
          )}
          {selectedLocation?.visitStatus === 'completed' && (
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.timelineText}>
                Completed: {formatDate(selectedLocation.updatedAt)}
              </Text>
            </View>
          )}
        </View>
        
        {selectedLocation?.visitStatus !== 'completed' && selectedLocation?.visitStatus !== 'cancelled' && (
          <View style={styles.actionSection}>
            <Text style={styles.detailSectionTitle}>Actions</Text>
            <View style={styles.actionButtons}>
              {selectedLocation?.visitStatus === 'pending' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.startButton]}
                  onPress={() => updateVisitLocationStatus(selectedLocation._id, 'in-progress')}
                >
                  <Ionicons name="play" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Start Visit</Text>
                </TouchableOpacity>
              )}
              
              {selectedLocation?.visitStatus === 'in-progress' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.completeButton]}
                  onPress={() => updateVisitLocationStatus(selectedLocation._id, 'completed')}
                >
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Complete</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => updateVisitLocationStatus(selectedLocation._id, 'cancelled')}
              >
                <Ionicons name="close" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {!showDetails ? (
          <>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Visit Locations</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search locations, notes, or status..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
            
            <FlatList
              data={filteredLocations}
              renderItem={renderLocationCard}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContainer}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="location-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No matching locations found' : 'No visit locations assigned'}
                  </Text>
                </View>
              }
            />
          </>
        ) : (
          renderDetailView()
        )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    marginLeft: 10,
  },
  listContainer: {
    padding: 15,
  },
  card: {
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
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
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
  cardAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  cardNotes: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  },
  cardDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  cardAssigned: {
    fontSize: 12,
    color: '#999',
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
    textAlign: 'center',
  },
  // Detail view styles
  detailContainer: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  detailCard: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    flex: 1,
  },
  detailNotes: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
    marginRight: 12,
  },
  timelineText: {
    fontSize: 14,
    color: '#666',
  },
  actionSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
  },
  startButton: {
    backgroundColor: '#2196F3',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
});

export default NotificationPage;