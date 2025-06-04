import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
  Dimensions,
  StatusBar,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { router, useRouter, Link } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Colors } from '@/constants/Colors';
import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');

// Dynamically get local IP for API URL (Expo SDK 49+)
const getApiBaseUrl = () => {
  // Try to get debuggerHost from Expo constants
  const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    return `http://${ip}:5000`;
  }
  // Fallback to default (you can customize this)
  return 'http://192.168.137.1:5000';
};

const API_BASE_URL = getApiBaseUrl();

export default function ImagePickerScreen() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [userName, setUserName] = useState('');
  
  // Use both router methods for better compatibility
  const routerHook = useRouter();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    console.log('ImagePicker component mounted');
    console.log('Router available:', !!router);
    console.log('Router hook available:', !!routerHook);
    
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const pickImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      // Launch image picker with optimized settings
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Moderate quality for initial selection
        exif: false, // Remove EXIF data to reduce size
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera is required!');
        return;
      }

      // Launch camera with optimized settings
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Moderate quality for initial capture
        exif: false, // Remove EXIF data to reduce size
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const compressImage = async (imageUri) => {
    try {
      // Compress and resize the image using expo-image-manipulator
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { resize: { width: 300, height: 300 } }, // Resize to 300x300
        ],
        {
          compress: 0.3, // Compress to 30% quality
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      return manipulatedImage;
    } catch (error) {
      console.error('Error compressing image:', error);
      throw error;
    }
  };

  const uploadImage = async () => {
    if (!selectedImage) {
      Alert.alert('No Image Selected', 'Please select an image first.');
      return;
    }

    if (!userName.trim()) {
      Alert.alert('Name Required', 'Please enter your name before uploading.');
      return;
    }

    setIsUploading(true);

    try {
      const token = await AsyncStorage.getItem('token');
      
      // Compress the image first
      console.log('Compressing image...');
      setIsCompressing(true);
      const compressedImage = await compressImage(selectedImage.uri);
      setIsCompressing(false);
      
      const base64Image = `data:image/jpeg;base64,${compressedImage.base64}`;

      // Check final size
      const sizeInKB = (base64Image.length * 0.75) / 1024; // Approximate size in KB
      console.log(`Compressed image size: ${sizeInKB.toFixed(2)} KB`);

      if (sizeInKB > 1000) { // 1MB limit
        Alert.alert(
          'Image Too Large', 
          'Image is still too large after compression. Please try a different image.',
          [{ text: 'OK' }]
        );
        setIsUploading(false);
        return;
      }

      console.log('Uploading image...');
      const response = await axios.put(
        `${API_BASE_URL}/api/profile`,
        {
          name: userName.trim(),
          profileImage: base64Image,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      if (response.data.success) {
        console.log('Upload successful, navigating to home...');
        
        // Store user data in AsyncStorage for immediate use
        try {
          await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
        } catch (storageError) {
          console.log('Storage error:', storageError);
        }
        
        // Direct navigation without alert (more reliable)
        console.log('Attempting direct navigation...');
        navigateToHome();
        
        // Show success message after navigation attempt
        setTimeout(() => {
          Alert.alert(
            'Success!',
            'Profile updated successfully!',
            [{ text: 'OK' }]
          );
        }, 500);
        
      } else {
        console.log('Upload failed:', response.data);
        Alert.alert('Upload Failed', response.data.message || 'Failed to upload image.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      let errorMessage = 'Failed to upload image. Please try again.';
      
      if (error.response?.status === 413) {
        errorMessage = 'Image is too large. Please select a smaller image.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Upload timeout. Please check your connection and try again.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert('Upload Failed', errorMessage);
    } finally {
      setIsUploading(false);
      setIsCompressing(false);
    }
  };

  const skipForNow = () => {
    Alert.alert(
      'Skip Profile Setup',
      'You can always add a profile picture later from the profile section.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Skip',
          onPress: navigateToHome,
        },
      ]
    );
  };

  const navigateToHome = async () => {
    console.log('=== NAVIGATION DEBUG START ===');
    console.log('Current location:', window?.location?.href);
    console.log('Router available:', !!router);
    console.log('Router hook available:', !!routerHook);
    
    try {
      // Method 1: Try different route paths with router hook
      if (routerHook && typeof routerHook.replace === 'function') {
        console.log('Attempting navigation with router hook...');
        try {
          await routerHook.replace('/(tabs)/home');
          console.log('Router hook navigation completed');
          return;
        } catch (hookError) {
          console.log('Router hook failed, trying alternative paths...');
          try {
            await routerHook.replace('/home');
            console.log('Router hook with /home completed');
            return;
          } catch (altError) {
            console.log('Alternative router hook path failed');
          }
        }
      }
      
      // Method 2: Try router import with different paths
      if (router && typeof router.replace === 'function') {
        console.log('Attempting navigation with router import...');
        try {
          await router.replace('/(tabs)/home');
          console.log('Router import navigation completed');
          return;
        } catch (routerError) {
          console.log('Router replace failed, trying push...');
          try {
            await router.push('/(tabs)/home');
            console.log('Router push navigation completed');
            return;
          } catch (pushError) {
            console.log('Router push failed, trying alternative path...');
            try {
              await router.replace('/home');
              console.log('Router with /home completed');
              return;
            } catch (altError) {
              console.log('All router methods failed');
            }
          }
        }
      }
      
      console.error('No working router method found');
      
    } catch (error) {
      console.error('Navigation error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Fallback: Try direct URL manipulation for web
      if (typeof window !== 'undefined' && window.location) {
        console.log('Attempting fallback navigation via window.location...');
        const currentUrl = window.location.href;
        const baseUrl = currentUrl.split('/').slice(0, -1).join('/');
        
        // Try different URL formats
        const possibleUrls = [
          `${baseUrl}/(tabs)/home`,
          `${baseUrl}/home`,
          `${window.location.origin}/(tabs)/home`,
          `${window.location.origin}/home`
        ];
        
        console.log('Trying URLs:', possibleUrls);
        
        // Try the first URL
        try {
          window.location.href = possibleUrls[0];
          return;
        } catch (urlError) {
          console.log('URL navigation failed:', urlError);
        }
      }
    }
    
    console.log('=== NAVIGATION DEBUG END ===');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.PRIMARY} />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={[Colors.PRIMARY, Colors.SECONDARY, Colors.LIGHT]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating Circles Animation */}
      <View style={styles.floatingCircles}>
        <Animated.View style={[styles.circle, styles.circle1, { transform: [{ scale: scaleAnim }] }]} />
        <Animated.View style={[styles.circle, styles.circle2, { transform: [{ scale: scaleAnim }] }]} />
        <Animated.View style={[styles.circle, styles.circle3, { transform: [{ scale: scaleAnim }] }]} />
      </View>

      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="person-circle" size={80} color="rgba(255,255,255,0.9)" />
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>Add a profile picture to personalize your account</Text>
        </View>

        {/* Name Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.nameInput}
            placeholder="Enter your name"
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={userName}
            onChangeText={setUserName}
            maxLength={50}
          />
        </View>

        {/* Image Preview */}
        <View style={styles.imageContainer}>
          {selectedImage ? (
            <Image 
              source={{ uri: selectedImage.uri }} 
              style={styles.selectedImage} 
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="camera" size={50} color="rgba(255,255,255,0.5)" />
              <Text style={styles.placeholderText}>No image selected</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
            <LinearGradient
              colors={[Colors.SECONDARY, Colors.PRIMARY]}
              style={styles.actionButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="images" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Choose from Gallery</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
            <LinearGradient
              colors={[Colors.SECONDARY, Colors.PRIMARY]}
              style={styles.actionButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Take Photo</Text>
            </LinearGradient>
          </TouchableOpacity>

          {selectedImage && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.uploadButton]} 
              onPress={uploadImage}
              disabled={isUploading || isCompressing}
            >
              <LinearGradient
                colors={(isUploading || isCompressing) ? [Colors.GRAY, Colors.GRAY] : ['#4CAF50', '#45a049']}
                style={styles.actionButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons 
                  name={(isUploading || isCompressing) ? "hourglass" : "cloud-upload"} 
                  size={24} 
                  color="#fff" 
                />
                <Text style={styles.actionButtonText}>
                  {isCompressing ? 'Compressing...' : isUploading ? 'Uploading...' : 'Upload Profile'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity style={styles.skipButton} onPress={skipForNow}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.homeButton} 
            onPress={() => {
              console.log('Manual navigation button pressed');
              navigateToHome();
            }}
          >
            <Text style={styles.homeButtonText}>Go to Home (Manual)</Text>
          </TouchableOpacity>
          
          <Link href="/(tabs)/home" asChild>
            <TouchableOpacity style={[styles.homeButton, { backgroundColor: 'rgba(76, 175, 80, 0.3)' }]}>
              <Text style={styles.homeButtonText}>Go to Home (Link)</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </Animated.View>

      {/* Disable interactions on the entire view */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, pointerEvents: 'none' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  floatingCircles: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  circle: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 100,
    height: 100,
    top: '10%',
    left: '10%',
  },
  circle2: {
    width: 150,
    height: 150,
    top: '60%',
    right: '10%',
  },
  circle3: {
    width: 80,
    height: 80,
    top: '30%',
    right: '20%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.WHITE,
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
    textShadow: '1px 1px 3px rgba(0,0,0,0.3)',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  selectedImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  placeholderImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 10,
    fontSize: 16,
  },
  inputContainer: {
    marginBottom: 30,
  },
  nameInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    color: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonContainer: {
    gap: 15,
  },
  actionButton: {
    borderRadius: 15,
    boxShadow: '0px 10px 15px rgba(0,0,0,0.2)',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 15,
    gap: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  uploadButton: {
    marginTop: 10,
  },
  navigationContainer: {
    marginTop: 30,
    gap: 15,
  },
  skipButton: {
    alignItems: 'center',
    padding: 15,
  },
  skipButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  homeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});