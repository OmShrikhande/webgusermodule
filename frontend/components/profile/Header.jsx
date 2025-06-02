import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const Header = ({ user, onEditAvatar }) => {
  const getInitials = (name, email) => {
    if (name && name.trim()) {
      return name.trim().charAt(0).toUpperCase();
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getImageUri = (profileImage) => {
    if (!profileImage) return null;
    if (profileImage.startsWith('http') || profileImage.startsWith('data:')) {
      return profileImage;
    }
    if (profileImage.startsWith('/uploads/')) {
      return `http://192.168.137.1:5000${profileImage}`;
    }
    return profileImage;
  };

  return (
    <View style={styles.header}>
      <View style={styles.avatarContainer}>
        {user.profileImage ? (
          <Image 
            source={{ uri: getImageUri(user.profileImage) }} 
            style={styles.avatar}
            onError={(error) => {
              console.log('Image load error:', error);
            }}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {getInitials(user.name, user.email)}
            </Text>
          </View>
        )}
        <TouchableOpacity 
          style={styles.editAvatarButton}
          onPress={onEditAvatar}
        >
          <Ionicons name="camera" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.name}>{user.name || 'User'}</Text>
      <Text style={styles.email}>{user.email}</Text>
      <Text style={styles.memberSince}>Member Since: {formatDate(user.joinDate)}</Text>
    </View>
  );
};

const styles = {
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: Colors.SECONDARY,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 5,
  },
  memberSince: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
};

export default Header;