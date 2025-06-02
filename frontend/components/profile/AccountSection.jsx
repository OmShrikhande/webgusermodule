import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';

const AccountSection = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        <Ionicons name="person-circle" size={20} color="#007BFF" /> Account
      </Text>
      
      <TouchableOpacity 
        style={styles.menuItem}
        onPress={() => navigation.push('/image-picker')}
      >
        <View style={styles.menuLeft}>
          <Ionicons name="person" size={24} color="#007BFF" style={styles.menuIcon} />
          <Text style={styles.menuText}>Edit Profile</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#888" />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuLeft}>
          <Ionicons name="security" size={24} color="#007BFF" style={styles.menuIcon} />
          <Text style={styles.menuText}>Security</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#888" />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuLeft}>
          <Ionicons name="shield-alt" size={22} color="#007BFF" style={styles.menuIcon} />
          <Text style={styles.menuText}>Privacy</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#888" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
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
    color: '#007BFF',
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
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
});

export default AccountSection;