import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDate, formatTime } from '@/utils/dateUtils'; // Assuming you have these utility functions

const AttendanceSection = ({ latestAttendance }) => {
  return (
    <View style={styles.attendanceSection}>
      <Text style={styles.sectionTitle}>
        <Ionicons name="time" size={20} color="#007BFF" /> Today's Activity
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
    </View>
  );
};

const styles = {
  attendanceSection: {
    marginHorizontal: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007BFF',
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendanceCard: {
    borderRadius: 15,
    overflow: 'hidden',
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 5 },
    // shadowOpacity: 0.1,
    // shadowRadius: 10,
    // elevation: 5,
    boxShadow: '0px 5px 10px rgba(0,0,0,0.1)',
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
};

export default AttendanceSection;