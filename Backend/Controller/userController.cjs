const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

module.exports = { login: exports.login, loginUser: exports.loginUser };