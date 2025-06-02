import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Colors } from '@/constants/Colors';

const LogoutButton = () => {
  const navigation = useNavigation();

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (token) {
                await axios.post('http://192.168.137.1:5000/api/logout', {}, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                });
              }
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('userId');
              navigation.replace('/login');
            } catch (error) {
              console.error('Error during logout:', error);
              navigation.replace('/login');
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
      <Text style={styles.logoutText}>Logout</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  logoutButton: {
    marginHorizontal: 15,
    marginTop: 20,
    marginBottom: 10,
    backgroundColor: Colors.PRIMARY,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LogoutButton;