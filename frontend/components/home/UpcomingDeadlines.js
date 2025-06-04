import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const UpcomingDeadlines = ({ deadlines, styles, getPriorityColor }) => (
  <View style={styles.sectionContainer}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Upcoming Deadlines</Text>
      <TouchableOpacity>
        <Text style={styles.seeAllText}>See All</Text>
      </TouchableOpacity>
    </View>
    {deadlines.map((deadline) => (
      <View key={deadline.id || deadline._id || deadline.title} style={styles.deadlineItem}>
        <View style={styles.deadlineInfo}>
          <Text style={styles.deadlineTitle}>{deadline.title}</Text>
          <Text style={styles.deadlineDate}>Due: {deadline.date}</Text>
        </View>
        <View
          style={[
            styles.priorityBadge,
            { backgroundColor: getPriorityColor(deadline.priority) },
          ]}
        >
          <Text style={styles.priorityText}>{deadline.priority}</Text>
        </View>
      </View>
    ))}
  </View>
);

export default UpcomingDeadlines;