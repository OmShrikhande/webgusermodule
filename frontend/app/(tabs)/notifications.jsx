import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl, 
  TextInput, 
  ScrollView,
  Alert,
  Dimensions,
  Platform,
  Image 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { pickImageForStatus, openCamera, openGallery } from '@/utils/imagePickerUtils';
import * as Notifications from 'expo-notifications';
import { setupLocalNotifications } from '@/notificationService';

// Get the local IP address automatically from Expo
const { debuggerHost } = Constants.expoConfig?.hostUri
  ? { debuggerHost: Constants.expoConfig.hostUri }
  : { debuggerHost: undefined };
const localIP = debuggerHost ? debuggerHost.split(':').shift() : 'localhost';
const API_URL = `http://${localIP}:5000`;

export default function NotificationsScreen() {
  const [visitLocations, setVisitLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [autoCompletionShown, setAutoCompletionShown] = useState(new Set());

  useEffect(() => {
    const getUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedUserId) {
          setUserId(storedUserId);
          console.log('User ID retrieved:', storedUserId);
          console.log('this is the ip of the laptop: ',API_URL);
        }
      } catch (error) {
        console.error('Error retrieving user ID:', error);
      }
    };

    getUserId();
  }, []);

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
    if (!userId) return;
    
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      const response = await axios.get(`${API_URL}/api/visit-locations/assigned/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        // Check for new or deleted visit locations
        const currentLocations = visitLocations || [];
        const newLocations = response.data.visitLocations;
        
        // Find new visit locations (ones that weren't in the previous list)
        const currentIds = currentLocations.map(loc => loc._id);
        const addedLocations = newLocations.filter(loc => !currentIds.includes(loc._id));
        
        // Find deleted visit locations (ones that were in the previous list but not in the new list)
        const newIds = newLocations.map(loc => loc._id);
        const deletedLocations = currentLocations.filter(loc => !newIds.includes(loc._id));
        
        // Notify about new visit locations
        if (addedLocations.length > 0) {
          console.log(`Detected ${addedLocations.length} new visit locations`);
          
          for (const location of addedLocations) {
            await showTaskNotification(
              'New Visit Assignment',
              `Visit to ${location.location?.address || 'new location'} has been assigned to you.`,
              { type: 'visit_assignment', visitLocationId: location._id }
            );
          }
        }
        
        // Notify about deleted visit locations
        if (deletedLocations.length > 0) {
          console.log(`Detected ${deletedLocations.length} deleted visit locations`);
          
          for (const location of deletedLocations) {
            await showTaskNotification(
              'Visit Assignment Removed',
              `Visit to ${location.location?.address || 'a location'} has been removed.`,
              { type: 'visit_deletion', visitLocationId: location._id }
            );
          }
        }
        
        setVisitLocations(newLocations);
        setFilteredLocations(newLocations);
      }
    } catch (error) {
      console.error('Error fetching visit locations:', error);
      Alert.alert('Error', 'Failed to fetch visit locations');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (userId) {
        // Check if tasks were updated in the background
        const checkForUpdates = async () => {
          const taskUpdated = await AsyncStorage.getItem('taskUpdated');
          if (taskUpdated === 'true') {
            console.log('Tasks were updated in the background - refreshing now');
            fetchVisitLocations();
            // Reset the flag
            await AsyncStorage.setItem('taskUpdated', 'false');
          } else {
            // Initial fetch anyway
            fetchVisitLocations();
          }
        };
        
        checkForUpdates();
        
        // Set up polling for automatic updates while on this screen
        let pollCount = 0;
        const pollingInterval = setInterval(() => {
          // Only log occasionally to reduce console spam
          pollCount = (pollCount + 1) % 5;
          if (pollCount === 0) {
            console.log('Auto-refreshing visit locations on notifications screen...');
          }
          fetchVisitLocations();
        }, 20000); // Set to 20000 ms (20 seconds)
        
        // Clean up interval when screen loses focus
        return () => clearInterval(pollingInterval);
      }
    }, [userId])
  );

  // Periodically check location for auto-completion
  useEffect(() => {
    let locationInterval;
    
    if (userId && visitLocations.length > 0) {
      // Check location every 30 seconds when app is focused
      locationInterval = setInterval(() => {
        getCurrentLocation();
      }, 30000);
    }

    return () => {
      if (locationInterval) {
        clearInterval(locationInterval);
      }
    };
  }, [userId, visitLocations]);

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
      // Get current location first for validation
      const currentLocation = await getCurrentLocation();
      if (!currentLocation) {
        Alert.alert('Error', 'Unable to get your current location. Please enable location services.');
        return;
      }

      // Find the visit location
      const visitLocation = visitLocations.find(loc => loc._id === visitLocationId);
      if (!visitLocation) {
        Alert.alert('Error', 'Visit location not found');
        return;
      }

      // For completion, validate location proximity (within 50 meters)
      if (newStatus === 'completed') {
        // Check if task is already completed
        if (visitLocation.visitStatus === 'completed') {
          Alert.alert('Task Already Completed', 'This task has already been completed.');
          return;
        }

        if (!visitLocation.location?.latitude || !visitLocation.location?.longitude) {
          Alert.alert('Error', 'Visit location coordinates not available');
          return;
        }

        const distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          visitLocation.location.latitude,
          visitLocation.location.longitude
        );

        if (distance > 50) {
          Alert.alert(
            'Location Required', 
            `You must be within 50 meters of the assigned location to complete this task. You are currently ${Math.round(distance)}m away.`
          );
          return;
        }

        // For completion, image is mandatory
        const imageAsset = await new Promise((resolve) => {
          Alert.alert(
            'Complete Visit',
            'An image is required to complete this visit. Please capture an image.',
            [
              { text: 'Camera', onPress: async () => resolve(await openCamera()) },
              { text: 'Gallery', onPress: async () => resolve(await openGallery()) },
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) }
            ]
          );
        });

        if (!imageAsset) {
          Alert.alert('Error', 'Image is required to complete the visit');
          return;
        }

        // Upload the completion image
        const imageUploaded = await uploadImage(imageAsset.uri, visitLocationId, 'complete');
        if (!imageUploaded) {
          Alert.alert('Error', 'Failed to upload image. Task cannot be completed.');
          return;
        }

        // If task was pending and user is completing directly, auto-start first
        if (visitLocation.visitStatus === 'pending') {
          // Ask for start image as well
          const startImageAsset = await new Promise((resolve) => {
            Alert.alert(
              'Start Visit Image',
              'Since you are completing the task directly, please also provide a start image.',
              [
                { text: 'Camera', onPress: async () => resolve(await openCamera()) },
                { text: 'Gallery', onPress: async () => resolve(await openGallery()) },
                { text: 'Skip Start Image', onPress: () => resolve(null) }
              ]
            );
          });

          if (startImageAsset) {
            await uploadImage(startImageAsset.uri, visitLocationId, 'start');
          }
        }
      }

      // For start action, optionally capture image
      if (newStatus === 'in-progress') {
        const shouldAddImage = await new Promise((resolve) => {
          Alert.alert(
            'Start Visit',
            'Would you like to add an image to mark the start of this visit?',
            [
              { text: 'Skip', onPress: () => resolve(false) },
              { text: 'Add Image', onPress: () => resolve(true) }
            ]
          );
        });

        if (shouldAddImage) {
          const imageAsset = await pickImageForStatus('start');
          if (imageAsset) {
            await uploadImage(imageAsset.uri, visitLocationId, 'start');
          }
        }
      }

      const token = await AsyncStorage.getItem('token');
      let body = { visitStatus: newStatus, userFeedback };
      if (newStatus === 'completed' && currentLocation) {
        body.userLocation = currentLocation;
      }
      
      const response = await axios.put(`${API_URL}/api/visit-locations/${visitLocationId}/status`, 
        body,
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
        
        // Refresh the visit locations to get updated data with images
        fetchVisitLocations();
      }
    } catch (error) {
      console.error('Error updating visit location status:', error);
      Alert.alert('Error', 'Failed to update visit location status');
    }
  };

  const pickImageForStatus = async (imageType) => {
    return new Promise((resolve) => {
      Alert.alert(
        `${imageType === 'start' ? 'Start Visit' : 'Complete Visit'}`,
        `Please capture an image to ${imageType} the visit.`,
        [
          { text: 'Camera', onPress: async () => resolve(await openCamera()) },
          { text: 'Gallery', onPress: async () => resolve(await openGallery()) },
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) }
        ]
      );
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FF9800';
      case 'reached':
        return '#9C27B0'; // Purple color for reached status
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

  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to show your current location on the map.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      setUserLocation(currentLocation);
      
      // Check if user reached any task location
      checkForLocationReached(currentLocation);
      
      return currentLocation;
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to get current location');
    }
  };

  const checkForLocationReached = async (currentLocation) => {
    if (!currentLocation || !visitLocations.length) return;

    // Check each pending task to see if user is at the location
    for (const visitLocation of visitLocations) {
      if (visitLocation.visitStatus === 'pending' && 
          visitLocation.location?.latitude && 
          visitLocation.location?.longitude &&
          !autoCompletionShown.has(visitLocation._id)) {
        
        const distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          visitLocation.location.latitude,
          visitLocation.location.longitude
        );

        // If user is within 50 meters of a pending task location
        if (distance <= 50) {
          console.log(`🎯 User reached location! Distance: ${Math.round(distance)}m`);
          console.log(`📍 Auto-completing task: ${visitLocation._id}`);
          
          // Mark this location as shown to prevent spam
          setAutoCompletionShown(prev => new Set([...prev, visitLocation._id]));
          
          // Automatically complete the task without user interference
          await autoCompleteTask(visitLocation._id, currentLocation);
          
          Alert.alert(
            'Task Auto-Completed! ✅',
            `You have reached the location for "${visitLocation.location?.address || 'Visit Location'}". The task has been automatically completed.`,
            [
              { text: 'OK', style: 'default' }
            ]
          );
          break; // Only show one alert at a time
        }
      }
    }
  };

  const autoCompleteTask = async (visitLocationId, currentLocation) => {
    try {
      console.log(`🚀 Starting auto-completion for task: ${visitLocationId}`);
      const token = await AsyncStorage.getItem('token');
      
      const response = await axios.put(`${API_URL}/api/visit-locations/${visitLocationId}/status`, 
        { 
          visitStatus: 'completed',
          userLocation: currentLocation,
          autoCompleted: true,
          userFeedback: 'Auto-completed when user reached location'
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        console.log(`✅ Task ${visitLocationId} auto-completed successfully in database`);
        
        // Update local state
        setVisitLocations(prevLocations =>
          prevLocations.map(location =>
            location._id === visitLocationId ? { 
              ...location, 
              visitStatus: 'completed',
              visitDate: new Date().toISOString(),
              userFeedback: 'Auto-completed when user reached location',
              autoCompleted: true
            } : location
          )
        );
        
        // Update selected location if it's the same
        if (selectedLocation && selectedLocation._id === visitLocationId) {
          setSelectedLocation(prev => ({ 
            ...prev, 
            visitStatus: 'completed',
            visitDate: new Date().toISOString(),
            userFeedback: 'Auto-completed when user reached location',
            autoCompleted: true
          }));
        }

        console.log(`📱 Local state updated for task: ${visitLocationId}`);
      } else {
        console.error(`❌ Failed to auto-complete task: ${response.data.message}`);
      }
    } catch (error) {
      console.error('❌ Error auto-completing task:', error);
      // Don't show alert to user since this is automatic
    }
  };

  const pickImage = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
        return null;
      }

      // Show action sheet to choose between camera and gallery
      Alert.alert(
        'Select Image',
        'Choose an option',
        [
          { text: 'Camera', onPress: () => openCamera() },
          { text: 'Gallery', onPress: () => openGallery() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      Alert.alert('Error', 'Failed to request camera permission');
    }
  };

  const openCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0];
      }
      return null;
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera');
      return null;
    }
  };

  const openGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0];
      }
      return null;
    } catch (error) {
      console.error('Error opening gallery:', error);
      Alert.alert('Error', 'Failed to open gallery');
      return null;
    }
  };

  const uploadImage = async (imageUri, visitLocationId, imageType) => {
    try {
      setUploadingImage(true);
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        return false;
      }

      // Get current location
      const currentLocation = await getCurrentLocation();
      
      // Create form data
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: `${imageType}_${Date.now()}.jpg`,
      });
      formData.append('imageType', imageType); // 'start' or 'complete'
      formData.append('timestamp', new Date().toISOString());
      
      if (currentLocation) {
        formData.append('location', JSON.stringify(currentLocation));
      }

      const response = await axios.post(
        `${API_URL}/api/visit-locations/${visitLocationId}/upload-image`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        Alert.alert('Success', 'Image uploaded successfully');
        return true;
      } else {
        Alert.alert('Error', 'Failed to upload image');
        return false;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
      return false;
    } finally {
      setUploadingImage(false);
    }
  };

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

  const calculateMapRegion = (userLoc, targetLoc) => {
    if (!userLoc || !targetLoc) return null;

    const minLat = Math.min(userLoc.latitude, targetLoc.latitude);
    const maxLat = Math.max(userLoc.latitude, targetLoc.latitude);
    const minLng = Math.min(userLoc.longitude, targetLoc.longitude);
    const maxLng = Math.max(userLoc.longitude, targetLoc.longitude);

    const latDelta = (maxLat - minLat) * 1.5; // Add some padding
    const lngDelta = (maxLng - minLng) * 1.5;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(latDelta, 0.01), // Minimum zoom level
      longitudeDelta: Math.max(lngDelta, 0.01),
    };
  };

  const handleCardPress = async (location) => {
    setSelectedLocation(location);
    setShowDetails(true);
    markVisitLocationAsRead(location._id);
    
    // Get current location and calculate map region
    const currentLoc = await getCurrentLocation();
    if (currentLoc && location.location?.latitude && location.location?.longitude) {
      const targetLoc = {
        latitude: location.location.latitude,
        longitude: location.location.longitude,
      };
      const region = calculateMapRegion(currentLoc, targetLoc);
      setMapRegion(region);
    }
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
        {item.address || 'No address provided'}
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
            <Text style={styles.detailText}>
              {selectedLocation?.address || 'No address provided'}
            </Text>
          </View>
          {selectedLocation?.location?.latitude && selectedLocation?.location?.longitude && (
            <View style={styles.detailRow}>
              <Ionicons name="map" size={20} color="#2196F3" />
              <Text style={styles.detailText}>
                Lat: {selectedLocation.location.latitude}, Lng: {selectedLocation.location.longitude}
              </Text>
            </View>
          )}
          
          {/* Map Section */}
          {mapRegion && selectedLocation?.location?.latitude && selectedLocation?.location?.longitude && (
            <View style={styles.mapContainer}>
              <Text style={styles.mapTitle}>Location Map</Text>
              {Platform.OS !== 'web' ? (
                <MapView
                  style={styles.map}
                  region={mapRegion}
                  showsUserLocation={false}
                  showsMyLocationButton={false}
                >
                  {/* User's current location marker */}
                  {userLocation && (
                    <Marker
                      coordinate={userLocation}
                      title="Your Location"
                      description="Your current position"
                      pinColor="blue"
                    >
                      <View style={styles.userMarker}>
                        <Ionicons name="person" size={20} color="#fff" />
                      </View>
                    </Marker>
                  )}
                  
                  {/* Target location marker */}
                  <Marker
                    coordinate={{
                      latitude: selectedLocation.location.latitude,
                      longitude: selectedLocation.location.longitude,
                    }}
                    title="Visit Location"
                    description={selectedLocation.location.address}
                    pinColor="red"
                  >
                    <View style={styles.targetMarker}>
                      <Ionicons name="location" size={20} color="#fff" />
                    </View>
                  </Marker>
                </MapView>
              ) : (
                <Text>Map is not supported on web.</Text>
              )}
              
              {/* Distance and directions info */}
              {userLocation && (
                <View style={styles.mapInfo}>
                  <View style={styles.mapInfoRow}>
                    <View style={styles.legendItem}>
                      <View style={styles.userMarkerLegend} />
                      <Text style={styles.legendText}>Your Location</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={styles.targetMarkerLegend} />
                      <Text style={styles.legendText}>Visit Location</Text>
                    </View>
                  </View>
                  <View style={styles.distanceInfo}>
                    <Ionicons name="navigate" size={16} color="#666" />
                    <Text style={styles.distanceText}>
                      Distance: {Math.round(calculateDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        selectedLocation.location.latitude,
                        selectedLocation.location.longitude
                      ))}m away
                    </Text>
                  </View>
                </View>
              )}
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
        
        {/* Images Section */}
        {(selectedLocation?.images && selectedLocation.images.length > 0) && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Visit Images</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
              {selectedLocation.images.map((image, index) => (
                <View key={index} style={styles.imageItem}>
                  <Image source={{ uri: `${API_URL}${image.url}` }} style={styles.visitImage} />
                  <View style={styles.imageInfo}>
                    <Text style={styles.imageType}>
                      {image.type === 'start' ? '🟢 Start' : '🔴 Complete'}
                    </Text>
                    <Text style={styles.imageTimestamp}>
                      {formatDate(image.timestamp)}
                    </Text>
                    {image.location && (
                      <Text style={styles.imageLocation}>
                        📍 {image.location.latitude.toFixed(6)}, {image.location.longitude.toFixed(6)}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
        
        {selectedLocation?.visitStatus !== 'completed' && selectedLocation?.visitStatus !== 'cancelled' && (
          <View style={styles.actionSection}>
            <Text style={styles.detailSectionTitle}>Actions</Text>
            
            {/* Location Status Info */}
            {userLocation && selectedLocation.location?.latitude && selectedLocation.location?.longitude && (
              <View style={styles.locationStatusContainer}>
                <View style={styles.locationStatusRow}>
                  <Ionicons 
                    name={selectedLocation?.visitStatus === 'reached' ? "location-sharp" :
                         (calculateDistance(
                           userLocation.latitude,
                           userLocation.longitude,
                           selectedLocation.location.latitude,
                           selectedLocation.location.longitude
                         ) <= 50 ? "checkmark-circle" : "location")} 
                    size={16} 
                    color={selectedLocation?.visitStatus === 'reached' ? "#9C27B0" :
                          (calculateDistance(
                            userLocation.latitude,
                            userLocation.longitude,
                            selectedLocation.location.latitude,
                            selectedLocation.location.longitude
                          ) <= 50 ? "#4CAF50" : "#FF9800")} 
                  />
                  <Text style={[styles.locationStatusText, {
                    color: selectedLocation?.visitStatus === 'reached' ? "#9C27B0" : 
                           (calculateDistance(
                             userLocation.latitude,
                             userLocation.longitude,
                             selectedLocation.location.latitude,
                             selectedLocation.location.longitude
                           ) <= 50 ? "#4CAF50" : "#FF9800")
                  }]}>
                    {selectedLocation?.visitStatus === 'reached' ? 
                      "Location reached - Upload image to complete task" :
                      (calculateDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        selectedLocation.location.latitude,
                        selectedLocation.location.longitude
                      ) <= 50 ? "Location reached - You can now upload image to complete" : 
                      `${Math.round(calculateDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        selectedLocation.location.latitude,
                        selectedLocation.location.longitude
                      ))}m away from location`)
                    }
                  </Text>
                </View>
              </View>
            )}
            
            <View style={styles.actionButtons}>
              {selectedLocation?.visitStatus === 'pending' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.startButton, uploadingImage && styles.disabledButton]}
                  onPress={() => updateVisitLocationStatus(selectedLocation._id, 'in-progress')}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <Text style={styles.actionButtonText}>Uploading...</Text>
                  ) : (
                    <>
                      <Ionicons name="play" size={16} color="#fff" />
                      <Text style={styles.actionButtonText}>Start Visit</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {selectedLocation?.visitStatus === 'reached' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.completeButton, uploadingImage && styles.disabledButton]}
                  onPress={() => updateVisitLocationStatus(selectedLocation._id, 'completed')}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <Text style={styles.actionButtonText}>Uploading...</Text>
                  ) : (
                    <>
                      <Ionicons name="camera" size={16} color="#fff" />
                      <Text style={styles.actionButtonText}>Upload & Complete</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              
              {selectedLocation?.visitStatus === 'in-progress' && (
                // Only show if user is within 50 meters of the assigned location
                userLocation &&
                selectedLocation.location?.latitude &&
                selectedLocation.location?.longitude &&
                calculateDistance(
                  userLocation.latitude,
                  userLocation.longitude,
                  selectedLocation.location.latitude,
                  selectedLocation.location.longitude
                ) <= 50 ? (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.completeButton, uploadingImage && styles.disabledButton]}
                    onPress={() => updateVisitLocationStatus(selectedLocation._id, 'completed')}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <Text style={styles.actionButtonText}>Uploading...</Text>
                    ) : (
                      <>
                        <Ionicons name="camera" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Upload & Complete</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.locationWarning}>
                    <Ionicons name="warning" size={16} color="#FF9800" />
                    <Text style={styles.locationWarningText}>
                      You must be within 50m of the location to upload image and complete this task
                    </Text>
                  </View>
                )
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

  // Only show visit locations that are NOT completed
  const nonCompletedLocations = filteredLocations.filter(
    location => location.visitStatus !== 'completed'
  );

  // Separate and sort tasks
  const pendingLocations = filteredLocations
    .filter(location => location.visitStatus !== 'completed')
    .sort((a, b) => {
      // Sort by status priority: reached > in-progress > pending, then by visitDate
      const statusPriority = { 'reached': 3, 'in-progress': 2, 'pending': 1 };
      const priorityA = statusPriority[a.visitStatus] || 0;
      const priorityB = statusPriority[b.visitStatus] || 0;
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Higher priority first
      }
      
      // If same priority, sort by visitDate ascending (earliest first)
      const dateA = a.visitDate ? new Date(a.visitDate) : new Date(0);
      const dateB = b.visitDate ? new Date(b.visitDate) : new Date(0);
      return dateA - dateB;
    });

  const completedLocations = filteredLocations
    .filter(location => location.visitStatus === 'completed')
    .sort((a, b) => {
      // Optional: sort completed by date descending (latest first)
      const dateA = a.visitDate ? new Date(a.visitDate) : new Date(0);
      const dateB = b.visitDate ? new Date(b.visitDate) : new Date(0);
      return dateB - dateA;
    });

  return (
    <LinearGradient
      colors={[Colors.PRIMARY, Colors.SECONDARY]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
        {!showDetails ? (
          <>
          
            
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
              data={[...pendingLocations, ...completedLocations]}
              renderItem={renderLocationCard}
              keyExtractor={item => item._id}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="location-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No matching locations found' : 'No visit locations assigned'}
                  </Text>
                </View>
              }
              refreshControl={
                <RefreshControl
                  refreshing={loading}
                  onRefresh={fetchVisitLocations}
                />
              }
            />
          </>
        ) : (
          renderDetailView()
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
    fontSize: 15,
    color: '#333',
    marginBottom: 8,
    lineHeight: 22,
    fontWeight: '500',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
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
  // Map styles
  mapContainer: {
    marginTop: 15,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  map: {
    width: '100%',
    height: 250,
    borderRadius: 8,
  },
  userMarker: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  targetMarker: {
    backgroundColor: '#F44336',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mapInfo: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  mapInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userMarkerLegend: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2196F3',
    marginRight: 6,
  },
  targetMarkerLegend: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F44336',
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  distanceText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginLeft: 6,
  },
  // Image styles
  imagesContainer: {
    flexDirection: 'row',
  },
  imageItem: {
    marginRight: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
    width: 200,
  },
  visitImage: {
    width: '100%',
    height: 120,
    borderRadius: 6,
    marginBottom: 8,
  },
  imageInfo: {
    alignItems: 'flex-start',
  },
  imageType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  imageTimestamp: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  imageLocation: {
    fontSize: 10,
    color: '#888',
  },
  disabledButton: {
    opacity: 0.6,
  },
  // Location status styles
  locationStatusContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  locationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationStatusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  locationWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
    marginBottom: 10,
  },
  locationWarningText: {
    fontSize: 12,
    color: '#856404',
    marginLeft: 8,
    flex: 1,
  },
});