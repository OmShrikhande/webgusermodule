const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const User = require('../model/usermodel.cjs');
const Attendance = require('../model/attendanceModel.cjs');
const { isWithinOfficeRange, calculateDistance } = require('../utils/locationUtils.cjs');
const { officeLocation, maxAllowedDistance, enforceLocationCheck } = require('../config/locationConfig.cjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

exports.loginUser = async (req, res) => {
  const { email, password, location } = req.body;
  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if password field exists
    if (!user.password) {
      return res.status(500).json({ message: 'User account is corrupted: missing password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if attendance already marked for today
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    let attendanceMessage = '';
    let attendanceTime = now.toLocaleTimeString();
    let attendanceDate = now.toLocaleDateString();
    let attendanceStatus = 'absent';
    let isInOffice = false;
    let distance = null;

    // Check if location is provided
    if (location && location.latitude && location.longitude) {
      // Calculate distance from office
      distance = Math.round(
        calculateDistance(
          location.latitude,
          location.longitude,
          officeLocation.latitude,
          officeLocation.longitude
        )
      );

      // Check if user is within office range
      isInOffice = isWithinOfficeRange(
        location.latitude,
        location.longitude,
        officeLocation.latitude,
        officeLocation.longitude,
        maxAllowedDistance
      );

      if (isInOffice) {
        attendanceStatus = 'present';
        attendanceMessage = 'Attendance marked successfully. You are present at the office.';
      } else {
        attendanceMessage = `Attendance marked as absent. You are ${distance}m away from office.`;
      }
    } else {
      attendanceMessage = 'Location not provided. Attendance marked as absent.';
    }

    // Try to find existing attendance for today
    const existingAttendance = await Attendance.findOne({
      userId: user._id,
      date: today,
    });

    if (!existingAttendance) {
      // If no attendance record exists for today, create one
      const attendance = new Attendance({
        userId: user._id,
        loginTime: now,
        date: today,
        status: attendanceStatus,
        location: {
          latitude: location?.latitude,
          longitude: location?.longitude,
          isInOffice: isInOffice,
          distance: distance,
        },
      });
      await attendance.save();
    } else {
      // Attendance already marked for today
      attendanceMessage = 'Attendance already marked for today';
      attendanceTime = new Date(existingAttendance.loginTime).toLocaleTimeString();
      attendanceDate = existingAttendance.date;
      attendanceStatus = existingAttendance.status;
      isInOffice = existingAttendance.location?.isInOffice || false;
      distance = existingAttendance.location?.distance;
    }

    // Update user's last login time
    await User.findByIdAndUpdate(user._id, { lastLoginTime: now });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });

    res.json({
      token,
      message: attendanceMessage,
      attendanceTime: attendanceTime,
      attendanceDate: attendanceDate,
      attendanceStatus: attendanceStatus,
      location: {
        isInOffice: isInOffice,
        distance: distance,
      },
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
        lastLoginTime: now,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, location } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. User not found.',
      });
    }
    // Check if password field exists
    if (!user.password) {
      return res.status(500).json({
        success: false,
        message: 'User account is corrupted: missing password',
      });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. Incorrect password.',
      });
    }

    // Check if attendance already marked for today
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    let attendanceMessage = '';
    let attendanceTime = now.toLocaleTimeString();
    let attendanceDate = now.toLocaleDateString();
    let attendanceStatus = 'absent';
    let isInOffice = false;
    let distance = null;

    // Check if location is provided
    if (location && location.latitude && location.longitude) {
      // Calculate distance from office
      distance = Math.round(
        calculateDistance(
          location.latitude,
          location.longitude,
          officeLocation.latitude,
          officeLocation.longitude
        )
      );

      // Check if user is within office range
      isInOffice = isWithinOfficeRange(
        location.latitude,
        location.longitude,
        officeLocation.latitude,
        officeLocation.longitude,
        maxAllowedDistance
      );

      if (isInOffice) {
        attendanceStatus = 'present';
        attendanceMessage = 'Login successful. Attendance marked as present.';
      } else {
        attendanceMessage = `Login successful. Attendance marked as absent. You are ${distance}m away from office.`;
      }
    } else {
      attendanceMessage = 'Login successful. Location not provided. Attendance marked as absent.';
    }

    // Try to find existing attendance for today
    const existingAttendance = await Attendance.findOne({
      userId: user._id,
      date: today,
    });

    if (!existingAttendance) {
      // If no attendance record exists for today, create one
      const attendance = new Attendance({
        userId: user._id,
        loginTime: now,
        date: today,
        status: attendanceStatus,
        location: {
          latitude: location?.latitude,
          longitude: location?.longitude,
          isInOffice: isInOffice,
          distance: distance,
        },
      });
      await attendance.save();
    } else {
      // Attendance already marked for today
      attendanceMessage = 'Login successful. Attendance was already marked earlier today.';
      attendanceTime = new Date(existingAttendance.loginTime).toLocaleTimeString();
      attendanceDate = existingAttendance.date;
      attendanceStatus = existingAttendance.status;
      isInOffice = existingAttendance.location?.isInOffice || false;
      distance = existingAttendance.location?.distance;
    }

    // Update user's last login time
    await User.findByIdAndUpdate(user._id, { lastLoginTime: now });

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.status(200).json({
      success: true,
      message: attendanceMessage,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
        lastLoginTime: now,
      },
      attendance: {
        time: attendanceTime,
        date: attendanceDate,
        status: attendanceStatus,
        location: {
          isInOffice: isInOffice,
          distance: distance,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication',
    });
  }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get latest attendance record
    const latestAttendance = await Attendance.findOne({ userId })
      .sort({ date: -1, loginTime: -1 });

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name || '',
        profileImage: user.profileImage || '',
        joinDate: user.joinDate,
        lastLoginTime: user.lastLoginTime,
        lastLogoutTime: user.lastLogoutTime,
        role: user.role
      },
      latestAttendance: latestAttendance ? {
        loginTime: latestAttendance.loginTime,
        logoutTime: latestAttendance.logoutTime,
        date: latestAttendance.date,
        status: latestAttendance.status
      } : null
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to save base64 image to file
const saveBase64Image = (base64Data, userId) => {
  try {
    // Remove data URL prefix if present
    const base64Image = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const filename = `profile_${userId}_${Date.now()}.jpg`;
    const filepath = path.join(uploadsDir, filename);

    // Save file
    fs.writeFileSync(filepath, base64Image, 'base64');
    
    return `/uploads/${filename}`;
  } catch (error) {
    console.error('Error saving image file:', error);
    return null;
  }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { name, profileImage } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    
    if (profileImage !== undefined) {
      // Check image size (base64 string length)
      const imageSizeKB = (profileImage.length * 0.75) / 1024;
      console.log(`Received image size: ${imageSizeKB.toFixed(2)} KB`);
      
      if (imageSizeKB > 2000) { // 2MB limit
        return res.status(413).json({ 
          success: false,
          message: 'Image too large. Please select a smaller image (max 2MB).' 
        });
      }

      // Option 1: Save as file (recommended for larger images)
      const imageUrl = saveBase64Image(profileImage, userId);
      if (imageUrl) {
        updateData.profileImage = imageUrl;
      } else {
        // Option 2: Store in database (fallback for smaller images)
        if (imageSizeKB < 500) { // Only store in DB if less than 500KB
          updateData.profileImage = profileImage;
        } else {
          return res.status(500).json({ 
            success: false,
            message: 'Failed to save image. Please try a smaller image.' 
          });
        }
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
        joinDate: user.joinDate,
        lastLoginTime: user.lastLoginTime,
        lastLogoutTime: user.lastLogoutTime,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'DocumentTooLarge' || error.code === 2) {
      return res.status(413).json({ 
        success: false,
        message: 'Image too large for database. Please select a smaller image.' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error while updating profile' 
    });
  }
};

// Handle logout
exports.logoutUser = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Update user's last logout time
    await User.findByIdAndUpdate(userId, { lastLogoutTime: now });

    // Update today's attendance record with logout time
    await Attendance.findOneAndUpdate(
      { userId, date: today },
      { logoutTime: now },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Logged out successfully',
      logoutTime: now.toLocaleTimeString(),
      logoutDate: now.toLocaleDateString()
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { 
  login: exports.login, 
  loginUser: exports.loginUser,
  getUserProfile: exports.getUserProfile,
  updateUserProfile: exports.updateUserProfile,
  logoutUser: exports.logoutUser
};