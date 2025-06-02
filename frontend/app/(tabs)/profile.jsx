import { Colors } from '@/constants/Colors';
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router, useNavigation, useFocusEffect } from 'expo-router';
import React, { useState, useCallback, useRef } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Dimensions,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const Profile = () => {
  const navigation = useNavigation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [user, setUser] = useState(null);
  const [latestAttendance, setLatestAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Set the header title and fetch user data
  React.useEffect(() => {
    navigation.setOptions({
      title: 'My Profile',
      headerTitleStyle: {
        fontWeight: 'bold',
        color: Colors.PRIMARY,
      },
      headerStyle: {
        backgroundColor: '#f8f8f8',
      },
    });

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
  }, [navigation]);

  // Fetch user profile data
  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await axios.get('http://192.168.137.1:5000/api/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setUser(response.data.user);
        setLatestAttendance(response.data.latestAttendance);
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Token expired or invalid
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('userId');
        router.replace('/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Focus effect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserProfile();
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              
              // Call logout API to track logout time
              if (token) {
                try {
                  await axios.post('http://192.168.137.1:5000/api/logout', {}, {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  });
                } catch (logoutError) {
                  console.error('Logout API error:', logoutError);
                  // Continue with logout even if API call fails
                }
              }

              // Clear stored tokens and user data
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('userId');
              
              // Navigate to login screen
              router.replace('/login');
            } catch (error) {
              console.error('Error during logout:', error);
              // Still navigate to login even if clearing storage fails
              router.replace('/login');
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
    // In a real app, you would save this preference
  };

  const toggleDarkMode = () => {
    setDarkModeEnabled(!darkModeEnabled);
    // In a real app, you would apply the theme change
  };

  const renderSettingItem = (icon, iconType, title, value, onToggle, color = Colors.PRIMARY) => {
    return (
      <View style={styles.settingItem}>
        <View style={styles.settingLeft}>
          {iconType === 'Ionicons' && (
            <Ionicons name={icon} size={24} color={color} style={styles.settingIcon} />
          )}
          {iconType === 'MaterialIcons' && (
            <MaterialIcons name={icon} size={24} color={color} style={styles.settingIcon} />
          )}
          {iconType === 'FontAwesome5' && (
            <FontAwesome5 name={icon} size={22} color={color} style={styles.settingIcon} />
          )}
          <Text style={styles.settingText}>{title}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#d1d1d1', true: Colors.PRIMARY + '80' }}
          thumbColor={value ? Colors.PRIMARY : '#f4f3f4'}
        />
      </View>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
      return `http://192.168.137.1:5000${profileImage}`;
    }
    
    return profileImage;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={50} color={Colors.PRIMARY} />
        <Text style={styles.errorText}>Failed to load profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUserProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Enhanced Profile Header */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <LinearGradient
          colors={[Colors.PRIMARY, Colors.SECONDARY]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.avatarContainer}>
            {user.profileImage ? (
              <Image 
                source={{ uri: getImageUri(user.profileImage) }} 
                style={styles.avatar}
                onError={(error) => {
                  console.log('Image load error:', error);
                }}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {getInitials(user.name, user.email)}
                </Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.editAvatarButton}
              onPress={() => router.push('/image-picker')}
            >
              <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.name}>{user.name || 'User'}</Text>
          <Text style={styles.email}>{user.email}</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>{formatDate(user.joinDate)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="person" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{user.role || 'User'}</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Attendance Times Section */}
      {latestAttendance && (
        <Animated.View 
          style={[
            styles.attendanceSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>
            <Ionicons name="time" size={20} color={Colors.PRIMARY} /> Today's Activity
          </Text>
          
          <View style={styles.attendanceCard}>
            <LinearGradient
              colors={['#E8F5E8', '#F0F8F0']}
              style={styles.attendanceGradient}
            >
              <View style={styles.attendanceRow}>
                <View style={styles.attendanceItem}>
                  <Ionicons name="log-in" size={24} color="#4CAF50" />
                  <Text style={styles.attendanceLabel}>Login Time</Text>
                  <Text style={styles.attendanceTime}>
                    {formatTime(latestAttendance.loginTime)}
                  </Text>
                  <Text style={styles.attendanceDate}>
                    {formatDate(latestAttendance.loginTime)}
                  </Text>
                </View>
                
                <View style={styles.attendanceDivider} />
                
                <View style={styles.attendanceItem}>
                  <Ionicons 
                    name="log-out" 
                    size={24} 
                    color={latestAttendance.logoutTime ? "#FF6B6B" : "#999"} 
                  />
                  <Text style={styles.attendanceLabel}>Logout Time</Text>
                  <Text style={[
                    styles.attendanceTime,
                    !latestAttendance.logoutTime && styles.attendanceTimeInactive
                  ]}>
                    {latestAttendance.logoutTime ? formatTime(latestAttendance.logoutTime) : 'Still logged in'}
                  </Text>
                  {latestAttendance.logoutTime && (
                    <Text style={styles.attendanceDate}>
                      {formatDate(latestAttendance.logoutTime)}
                    </Text>
                  )}
                </View>
              </View>
              
              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusBadge,
                  latestAttendance.status === 'present' ? styles.statusPresent : styles.statusAbsent
                ]}>
                  <Ionicons 
                    name={latestAttendance.status === 'present' ? "checkmark-circle" : "close-circle"} 
                    size={16} 
                    color="#fff" 
                  />
                  <Text style={styles.statusText}>
                    {latestAttendance.status === 'present' ? 'Present' : 'Absent'}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </Animated.View>
      )}

      {/* Settings Section */}
      <Animated.View 
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Text style={styles.sectionTitle}>
          <Ionicons name="settings" size={20} color={Colors.PRIMARY} /> Settings
        </Text>
        
        {renderSettingItem(
          'notifications', 
          'Ionicons', 
          'Notifications', 
          notificationsEnabled, 
          toggleNotifications
        )}
        
        {renderSettingItem(
          'moon', 
          'Ionicons', 
          'Dark Mode', 
          darkModeEnabled, 
          toggleDarkMode
        )}
      </Animated.View>

      {/* Account Section */}
      <Animated.View 
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Text style={styles.sectionTitle}>
          <Ionicons name="person-circle" size={20} color={Colors.PRIMARY} /> Account
        </Text>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => router.push('/image-picker')}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="person" size={24} color={Colors.PRIMARY} style={styles.menuIcon} />
            <Text style={styles.menuText}>Edit Profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <MaterialIcons name="security" size={24} color={Colors.PRIMARY} style={styles.menuIcon} />
            <Text style={styles.menuText}>Security</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <FontAwesome5 name="shield-alt" size={22} color={Colors.PRIMARY} style={styles.menuIcon} />
            <Text style={styles.menuText}>Privacy</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </TouchableOpacity>
      </Animated.View>

      {/* Help Section */}
      <Animated.View 
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Text style={styles.sectionTitle}>
          <Ionicons name="help-circle" size={20} color={Colors.PRIMARY} /> Help & Support
        </Text>
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="help-circle" size={24} color={Colors.PRIMARY} style={styles.menuIcon} />
            <Text style={styles.menuText}>Help Center</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <MaterialIcons name="contact-support" size={24} color={Colors.PRIMARY} style={styles.menuIcon} />
            <Text style={styles.menuText}>Contact Us</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </TouchableOpacity>
      </Animated.View>

      {/* Enhanced Logout Button */}
      <Animated.View 
        style={[
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LinearGradient
            colors={['#FF6B6B', '#FF5252']}
            style={styles.logoutButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="log-out-outline" size={22} color="#fff" style={styles.logoutIcon} />
            <Text style={styles.logoutText}>Logout</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* App Info */}
      <Animated.View 
        style={[
          styles.appInfo,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Text style={styles.appVersion}>Version 1.0.0</Text>
        <Text style={styles.appCopyright}>© 2024 {Colors.Appname}. All rights reserved.</Text>
      </Animated.View>
    </ScrollView>
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
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.GRAY,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: Colors.GRAY,
    marginTop: 10,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: Colors.PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    marginBottom: 20,
    borderRadius: 0,
    overflow: 'hidden',
  },
  headerGradient: {
    padding: 30,
    paddingTop: 50,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: Colors.SECONDARY,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  email: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginTop: 3,
    textAlign: 'center',
  },
  attendanceSection: {
    marginHorizontal: 15,
    marginBottom: 20,
  },
  attendanceCard: {
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
    height: 60,
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
  attendanceDate: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 15,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  statusPresent: {
    backgroundColor: '#4CAF50',
  },
  statusAbsent: {
    backgroundColor: '#F44336',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.PRIMARY,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 15,
  },
  settingText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 15,
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  logoutButton: {
    marginHorizontal: 15,
    marginTop: 20,
    marginBottom: 10,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  logoutButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    borderRadius: 15,
  },
  logoutIcon: {
    marginRight: 10,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  appInfo: {
    alignItems: 'center',
    marginVertical: 30,
    paddingHorizontal: 20,
  },
  appVersion: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  appCopyright: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default Profile;