import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const UserHeader = ({ userData, latestAttendance, fadeAnim, slideAnim, getImageUri, getInitials, Colors, styles, onNotificationPress, unreadTasksCount }) => (
  <LinearGradient
    colors={[Colors.PRIMARY, Colors.SECONDARY]}
    style={styles.headerGradient}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
  >
    <View style={styles.userInfo}>
      <View style={styles.avatarContainer}>
        {userData.profileImage ? (
          <Image 
            source={{ uri: getImageUri(userData.profileImage) }} 
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {getInitials(userData.name, userData.email)}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.userDetails}>
        <Text style={styles.userName}>Welcome, {userData.name || 'User'}</Text>
        <Text style={styles.userRole}>{userData.role || 'Employee'}</Text>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusIndicator,
              {
                backgroundColor:
                  latestAttendance?.status === 'present'
                    ? '#4CAF50'
                    : latestAttendance?.status === 'half day'
                      ? '#FFC107'
                      : '#F44336'
              },
            ]}
          />
          <Text style={styles.statusText}>
            {latestAttendance?.status === 'present'
              ? 'Present'
              : latestAttendance?.status === 'half day'
                ? 'Half Day'
                : 'Absent'}
          </Text>
        </View>
      </View>
    </View>
    <TouchableOpacity style={styles.notificationButton} onPress={onNotificationPress}>
      <Ionicons name="notifications" size={24} color="rgba(255,255,255,0.9)" />
      {unreadTasksCount > 0 && (
        <View style={styles.notificationBadge}>
          <Text style={styles.notificationCount}>{unreadTasksCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  </LinearGradient>
);

export default UserHeader;