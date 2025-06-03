import React from 'react';
import { View, Text } from 'react-native';

const RecentActivity = ({ timeline, styles }) => (
  <View style={styles.sectionContainer}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Recent Activity</Text>
    </View>
    {timeline.map((activity) => (
      <View key={activity.id} style={styles.timelineItem}>
        <View style={styles.timelineDot} />
        <View style={styles.timelineContent}>
          <Text style={styles.timelineText}>
            <Text style={styles.timelineUser}>{activity.user}</Text>{' '}
            {activity.action}{' '}
            <Text style={styles.timelineItem}>{activity.item}</Text>
          </Text>
          <Text style={styles.timelineTime}>{activity.time}</Text>
        </View>
      </View>
    ))}
  </View>
);

export default RecentActivity;