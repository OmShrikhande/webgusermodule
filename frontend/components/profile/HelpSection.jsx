import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const HelpSection = () => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        <Ionicons name="help-circle" size={20} color={Colors.PRIMARY} /> Help & Support
      </Text>
      
      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuLeft}>
          <Ionicons name="help-circle" size={24} color={Colors.PRIMARY} style={styles.menuIcon} />
          <Text style={styles.menuText}>Help Center</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#888" />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuLeft}>
          <Ionicons name="contact-support" size={24} color={Colors.PRIMARY} style={styles.menuIcon} />
          <Text style={styles.menuText}>Contact Us</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#888" />
      </TouchableOpacity>
    </View>
  );
};

const styles = {
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
    color: Colors.PRIMARY,
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
};

export default HelpSection;