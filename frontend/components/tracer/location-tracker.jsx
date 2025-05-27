import { FontAwesome5, MaterialIcons } from '@expo/vector-icons'
import { useEffect, useRef, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const LocationTracker = () => {
  const [isTracking, setIsTracking] = useState(false)
  const [pathPoints, setPathPoints] = useState([])
  const [isWithinTrackingHours, setIsWithinTrackingHours] = useState(false)
  const [speedLimit, setSpeedLimit] = useState(30) // km/h
  const [currentSpeed, setCurrentSpeed] = useState(0)
  const [averageSpeed, setAverageSpeed] = useState(0)
  const [showSpeedWarning, setShowSpeedWarning] = useState(false)
  const [trackingStartTime, setTrackingStartTime] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [totalDistance, setTotalDistance] = useState(0)
  const [currentLocation, setCurrentLocation] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    timestamp: Date.now()
  })
  
  const locationInterval = useRef(null)
  const insets = useSafeAreaInsets()
  
  // Check if current time is between 10 AM and 7 PM
  const checkTrackingHours = () => {
    const now = new Date()
    const hours = now.getHours()
    const isWithinHours = hours >= 10 && hours < 19 // 10 AM to 7 PM
    setIsWithinTrackingHours(isWithinHours)
    return isWithinHours
  }

  useEffect(() => {
    // Check tracking hours initially and every minute
    checkTrackingHours()
    const interval = setInterval(checkTrackingHours, 60000)
    
    // Cleanup
    return () => {
      if (locationInterval.current) {
        clearInterval(locationInterval.current)
      }
      clearInterval(interval)
    }
  }, [])

  // Start location tracking with mock data
  const startTracking = () => {
    if (!isWithinTrackingHours) {
      Alert.alert(
        'Outside Tracking Hours',
        'Tracking is only available from 10 AM to 7 PM.',
        [{ text: 'OK' }]
      )
      return
    }

    try {
      // Set tracking start time
      setTrackingStartTime(Date.now())
      
      // Start with current path or empty array
      const currentPath = [...pathPoints]
      
      // Add initial point if path is empty
      if (currentPath.length === 0) {
        currentPath.push({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          timestamp: Date.now()
        })
        setPathPoints(currentPath)
      }
      
      let lastTimestamp = Date.now()
      let totalSpeed = 0
      let speedReadings = 0
      let cumulativeDistance = totalDistance
      
      // Simulate location updates every 5 seconds
      locationInterval.current = setInterval(() => {
        // Generate a new point that's slightly offset from the last point
        const lastPoint = currentPath[currentPath.length - 1]
        const newPoint = {
          latitude: lastPoint.latitude + (Math.random() * 0.001 - 0.0005),
          longitude: lastPoint.longitude + (Math.random() * 0.001 - 0.0005),
          timestamp: Date.now()
        }
        
        const now = Date.now()
        const timeDiff = (now - lastTimestamp) / 1000 // in seconds
        lastTimestamp = now
        
        // Calculate distance between last point and new point
        const distance = calculateDistanceBetweenPoints(
          lastPoint.latitude, lastPoint.longitude,
          newPoint.latitude, newPoint.longitude
        )
        
        // Update total distance
        cumulativeDistance += distance
        setTotalDistance(cumulativeDistance)
        
        // Calculate speed in km/h
        const speed = (distance / timeDiff) * 3600 // convert to km/h
        setCurrentSpeed(speed)
        
        // Update average speed
        totalSpeed += speed
        speedReadings++
        setAverageSpeed(totalSpeed / speedReadings)
        
        // Check if speed exceeds limit
        setShowSpeedWarning(speed > speedLimit)
        
        // Update location
        setCurrentLocation(newPoint)
        
        // Add to path
        currentPath.push(newPoint)
        setPathPoints([...currentPath])
        
      }, 5000)
      
      setIsTracking(true)
    } catch (error) {
      Alert.alert('Error', 'Error starting tracking: ' + error.toString())
    }
  }
  
  // Calculate distance between two points
  const calculateDistanceBetweenPoints = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1)
    const dLon = deg2rad(lon2 - lon1)
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = R * c // Distance in km
    return distance
  }

  // Stop location tracking
  const stopTracking = () => {
    if (locationInterval.current) {
      clearInterval(locationInterval.current)
      locationInterval.current = null
    }
    setIsTracking(false)
    setShowSpeedWarning(false)
    // Keep the current speed and average speed for display
  }

  // Clear the current path
  const clearPath = () => {
    Alert.alert(
      'Clear Path',
      'Are you sure you want to clear the current path?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            setPathPoints([])
            setTotalDistance(0)
          }
        }
      ]
    )
  }

  // Save current path (placeholder for future implementation)
  const savePath = () => {
    if (pathPoints.length === 0) {
      Alert.alert('No Path', 'There is no path to save.')
      return
    }
    
    // Here you would implement saving to storage or backend
    Alert.alert('Success', 'Path saved successfully!')
  }

  // Format time for display
  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  // Format duration in minutes:seconds
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const deg2rad = (deg) => {
    return deg * (Math.PI/180)
  }

  return (
    <View style={styles.container}>
      {/* Status Bar */}
      <View style={[styles.statusBar, { paddingTop: insets.top }]}>
        <View style={styles.statusContent}>
          <Text style={styles.statusText}>
            {isWithinTrackingHours 
              ? 'Tracking Available (10 AM - 7 PM)' 
              : 'Outside Tracking Hours (10 AM - 7 PM)'}
          </Text>
          <Text style={styles.statusText}>
            {isTracking ? 'Tracking Active' : 'Tracking Inactive'}
          </Text>
        </View>
      </View>
      
      {/* Main Content */}
      <ScrollView style={styles.scrollView}>
        {/* Current Stats Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Status</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialIcons name="location-on" size={24} color="#2196F3" />
              <View>
                <Text style={styles.statLabel}>Location</Text>
                <Text style={styles.statValue}>
                  {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialIcons name="speed" size={24} color="#4CAF50" />
              <View>
                <Text style={styles.statLabel}>Current Speed</Text>
                <Text style={styles.statValue}>
                  {currentSpeed.toFixed(1)} km/h
                  {showSpeedWarning && (
                    <Text style={styles.warningText}> (Exceeding limit!)</Text>
                  )}
                </Text>
              </View>
            </View>
            
            <View style={styles.statItem}>
              <FontAwesome5 name="tachometer-alt" size={20} color="#FF9800" />
              <View>
                <Text style={styles.statLabel}>Average Speed</Text>
                <Text style={styles.statValue}>{averageSpeed.toFixed(1)} km/h</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <FontAwesome5 name="route" size={20} color="#9C27B0" />
              <View>
                <Text style={styles.statLabel}>Total Distance</Text>
                <Text style={styles.statValue}>{totalDistance.toFixed(2)} km</Text>
              </View>
            </View>
            
            <View style={styles.statItem}>
              <MaterialIcons name="timer" size={24} color="#F44336" />
              <View>
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValue}>
                  {trackingStartTime 
                    ? formatDuration((Date.now() - trackingStartTime) / 1000)
                    : '0:00'}
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Path Points Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Path Points ({pathPoints.length})</Text>
            {pathPoints.length > 0 && (
              <TouchableOpacity onPress={clearPath}>
                <MaterialIcons name="delete" size={24} color="#F44336" />
              </TouchableOpacity>
            )}
          </View>
          
          {pathPoints.length === 0 ? (
            <Text style={styles.emptyText}>No path points recorded yet.</Text>
          ) : (
            <ScrollView style={styles.pointsList}>
              {pathPoints.map((point, index) => (
                <View key={index} style={styles.pointItem}>
                  <Text style={styles.pointIndex}>{index + 1}</Text>
                  <View style={styles.pointDetails}>
                    <Text style={styles.pointCoords}>
                      {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                    </Text>
                    <Text style={styles.pointTime}>
                      {formatTime(point.timestamp)}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
        
        {/* Settings Card */}
        {showSettings && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Speed Limit (km/h)</Text>
              <View style={styles.speedLimitControls}>
                <TouchableOpacity 
                  style={styles.speedButton}
                  onPress={() => setSpeedLimit(Math.max(5, speedLimit - 5))}
                >
                  <MaterialIcons name="remove" size={20} color="white" />
                </TouchableOpacity>
                
                <Text style={styles.speedLimitValue}>{speedLimit}</Text>
                
                <TouchableOpacity 
                  style={styles.speedButton}
                  onPress={() => setSpeedLimit(speedLimit + 5)}
                >
                  <MaterialIcons name="add" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
      
      {/* Action Buttons */}
      <View style={[styles.actionButtons, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity 
          style={[
            styles.actionButton, 
            styles.settingsButton
          ]}
          onPress={() => setShowSettings(!showSettings)}
        >
          <MaterialIcons name="settings" size={24} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.actionButton, 
            styles.trackButton,
            isTracking ? styles.stopButton : styles.startButton,
            !isWithinTrackingHours && !isTracking ? styles.disabledButton : null
          ]}
          onPress={isTracking ? stopTracking : startTracking}
          disabled={!isWithinTrackingHours && !isTracking}
        >
          <MaterialIcons 
            name={isTracking ? "stop" : "play-arrow"} 
            size={24} 
            color="white" 
          />
          <Text style={styles.buttonText}>
            {isTracking ? 'Stop' : 'Start'} Tracking
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.actionButton, 
            styles.saveButton,
            pathPoints.length === 0 ? styles.disabledButton : null
          ]}
          onPress={savePath}
          disabled={pathPoints.length === 0}
        >
          <MaterialIcons name="save" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    paddingTop: 70, // Space for status bar
    paddingHorizontal: 15,
  },
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#2196F3',
    padding: 10,
    zIndex: 1,
  },
  statusContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusText: {
    fontSize: 14,
    color: 'white',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: '48%',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  warningText: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
  },
  pointsList: {
    maxHeight: 300,
  },
  pointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pointIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2196F3',
    color: 'white',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontWeight: 'bold',
    marginRight: 10,
  },
  pointDetails: {
    flex: 1,
  },
  pointCoords: {
    fontSize: 14,
    color: '#333',
  },
  pointTime: {
    fontSize: 12,
    color: '#666',
  },
  settingItem: {
    marginBottom: 15,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  speedLimitControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedButton: {
    backgroundColor: '#2196F3',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedLimitValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 15,
    minWidth: 30,
    textAlign: 'center',
  },
  actionButtons: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  trackButton: {
    minWidth: 180,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  settingsButton: {
    backgroundColor: '#607D8B',
    width: 50,
    height: 50,
    borderRadius: 25,
    padding: 0,
  },
  saveButton: {
    backgroundColor: '#2196F3',
    width: 50,
    height: 50,
    borderRadius: 25,
    padding: 0,
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },
})

export default LocationTracker