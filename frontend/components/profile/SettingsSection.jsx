import React from 'react';
import { View, Text, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const SettingsSection = ({ notificationsEnabled, darkModeEnabled, toggleNotifications, toggleDarkMode }) => {
  const renderSettingItem = (icon, title, value, onToggle) => {
    return (
      <View style={styles.settingItem}>
        <View style={styles.settingLeft}>
          <Ionicons name={icon} size={24} color={Colors.PRIMARY} style={styles.settingIcon} />
          <Text style={styles.settingText}>{title}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#d1d1d1', true: Colors.PRIMARY + '80' }}
          thumbColor={value ? Colors.PRIMARY : '#f4f3f4'}
        />
      </View>
    );
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        <Ionicons name="settings" size={20} color={Colors.PRIMARY} /> Settings
      </Text>
      {renderSettingItem('notifications', 'Notifications', notificationsEnabled, toggleNotifications)}
      {renderSettingItem('moon', 'Dark Mode', darkModeEnabled, toggleDarkMode)}
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
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 15,
  },
  settingText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
};

export default SettingsSection;