import React from 'react';
import { View, Text } from 'react-native';

const QuickStats = ({ userData, deadlines, styles }) => (
  <View style={styles.statsContainer}>
    <View style={styles.statCard}>
      <Text style={styles.statNumber}>{userData.tasks}</Text>
      <Text style={styles.statLabel}>Tasks</Text>
    </View>
    <View style={styles.statCard}>
      <Text style={styles.statNumber}>{userData.completedTasks}</Text>
      <Text style={styles.statLabel}>Completed</Text>
    </View>
    <View style={styles.statCard}>
      <Text style={styles.statNumber}>{deadlines.length}</Text>
      <Text style={styles.statLabel}>Deadlines</Text>
    </View>
  </View>
);

export default QuickStats;