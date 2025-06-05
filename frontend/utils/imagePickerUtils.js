import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export const pickImageForStatus = async (imageType) => {
  return new Promise((resolve) => {
    Alert.alert(
      `${imageType === 'start' ? 'Start Visit' : 'Complete Visit'}`,
      `Please capture an image to ${imageType} the visit.`,
      [
        { text: 'Camera', onPress: async () => resolve(await openCamera()) },
        { text: 'Gallery', onPress: async () => resolve(await openGallery()) },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) }
      ]
    );
  });
};

export const openCamera = async () => {
  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0];
    }
    return null;
  } catch (error) {
    console.error('Error opening camera:', error);
    Alert.alert('Error', 'Failed to open camera');
    return null;
  }
};

export const openGallery = async () => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0];
    }
    return null;
  } catch (error) {
    console.error('Error opening gallery:', error);
    Alert.alert('Error', 'Failed to open gallery');
    return null;
  }
};