import React from 'react';
import { View, Text } from 'react-native';

const QuickStats = ({ userData, deadlines, styles, completedTasksCount = 0, totalTasksCount = 0 }) => (
  <View style={styles.statsContainer}>
    <View style={styles.statCard}>
      <Text style={styles.statNumber}>{totalTasksCount}</Text>
      <Text style={styles.statLabel}>Assigned</Text>
    </View>
    <View style={styles.statCard}>
      <Text style={styles.statNumber}>{completedTasksCount}</Text>
      <Text style={styles.statLabel}>Completed</Text>
    </View>
    <View style={styles.statCard}>
      <Text style={styles.statNumber}>{deadlines.length}</Text>
      <Text style={styles.statLabel}>Deadlines</Text>
    </View>
  </View>
);

export default QuickStats;