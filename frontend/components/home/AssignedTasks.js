import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const AssignedTasks = ({ visitLocations, styles, onSeeAllPress }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Visit Locations</Text>
        <TouchableOpacity onPress={onSeeAllPress}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>
      {visitLocations && visitLocations.length > 0 ? (
        visitLocations.slice(0, 3).map((location) => (
          <View key={location._id} style={styles.taskItem}>
            <View style={styles.taskInfo}>
              <Text style={styles.taskTitle}>Visit Location</Text>
              <Text style={styles.taskAssignee}>
                Address: {location.location?.address || 'No address provided'}
              </Text>
              <Text style={styles.taskDueDate}>
                Visit Date: {formatDate(location.visitDate)}
              </Text>
              {location.adminNotes && (
                <Text style={styles.adminNotes}>
                  Notes: {location.adminNotes}
                </Text>
              )}
            </View>
            <View style={[styles.taskStatusContainer, { backgroundColor: getStatusColor(location.visitStatus) }]}>
              <Text style={[styles.taskStatus, { color: '#fff' }]}>{location.visitStatus}</Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyTasksContainer}>
          <Text style={styles.emptyTasksText}>No visit locations assigned</Text>
        </View>
      )}
    </View>
  );
};

export default AssignedTasks;