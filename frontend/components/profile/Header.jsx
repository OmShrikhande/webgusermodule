import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { formatDate } from '@/utils/dateUtils';
import Constants from 'expo-constants';

const { debuggerHost } = Constants.expoConfig?.hostUri
  ? { debuggerHost: Constants.expoConfig.hostUri }
  : { debuggerHost: undefined };
const localIP = debuggerHost ? debuggerHost.split(':').shift() : 'localhost';
const API_URL = `http://${localIP}:5000`;

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
      return `${API_URL}${profileImage}`;
    }
    return profileImage;
  };

  return (
    <View style={styles.header}>
      <View style={styles.avatarSection}>
        <View style={styles.avatarContainer}>
          {user.profileImage ? (
            <Image
              source={{ uri: getImageUri(user.profileImage) }}
              style={styles.avatar}
              resizeMode="cover"
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
            activeOpacity={0.7}
          >
            <Ionicons name="camera" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.infoSection}>
        <Text style={styles.name}>{user.name || 'User'}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <Text style={styles.memberSince}>
          Member Since: {formatDate(user.joinDate)}
        </Text>
      </View>
    </View>
  );
};

const AVATAR_SIZE = 120;

const styles = {
  header: {
    marginBottom: 20,
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: '#eee',
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#44516e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: Colors.SECONDARY,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  infoSection: {
    alignItems: 'center',
    marginTop: 8,
  },
  name: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
    marginTop: 4,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  email: {
    fontSize: 16,
    color: '#e0e0e0',
    marginBottom: 2,
  },
  memberSince: {
    fontSize: 14,
    color: '#b0b8c1',
    marginTop: 2,
  },
};

export default Header;