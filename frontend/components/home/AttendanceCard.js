import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const AttendanceCard = ({ latestAttendance, fadeAnim, slideAnim, formatTime, Colors, styles }) => (
  <LinearGradient
    colors={['#E8F5E8', '#F0F8F0']}
    style={styles.attendanceGradient}
  >
    <View style={styles.attendanceHeader}>
      <Ionicons name="time" size={24} color={Colors.PRIMARY} />
      <Text style={styles.attendanceTitle}>Today's Activity</Text>
    </View>
    <View style={styles.attendanceRow}>
      <View style={styles.attendanceItem}>
        <Ionicons name="log-in" size={20} color="#4CAF50" />
        <Text style={styles.attendanceLabel}>Login</Text>
        <Text style={styles.attendanceTime}>
          {formatTime(latestAttendance.loginTime)}
        </Text>
      </View>
      <View style={styles.attendanceDivider} />
      <View style={styles.attendanceItem}>
        <Ionicons 
          name="log-out" 
          size={20} 
          color={latestAttendance.logoutTime ? "#FF6B6B" : "#999"} 
        />
        <Text style={styles.attendanceLabel}>Logout</Text>
        <Text style={[
          styles.attendanceTime,
          !latestAttendance.logoutTime && styles.attendanceTimeInactive
        ]}>
          {latestAttendance.logoutTime ? formatTime(latestAttendance.logoutTime) : 'Active'}
        </Text>
      </View>
    </View>
  </LinearGradient>
);

export default AttendanceCard;
