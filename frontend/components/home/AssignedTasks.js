import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const AssignedTasks = ({ tasks, styles }) => (
  <View style={styles.sectionContainer}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Assigned Tasks</Text>
      <TouchableOpacity>
        <Text style={styles.seeAllText}>See All</Text>
      </TouchableOpacity>
    </View>
    {tasks.map((task) => (
      <View key={task.id} style={styles.taskItem}>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <Text style={styles.taskAssignee}>
            Assigned to: {task.assignedTo}
          </Text>
          <Text style={styles.taskDueDate}>Due: {task.dueDate}</Text>
        </View>
        <View style={styles.taskStatusContainer}>
          <Text style={styles.taskStatus}>{task.status}</Text>
        </View>
      </View>
    ))}
  </View>
);

export default AssignedTasks;