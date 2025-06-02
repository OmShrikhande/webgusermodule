const express = require('express');
const router = express.Router();
const authController = require('../Controller/userController.cjs');
const User = require('../model/usermodel.cjs');
const Alert = require('../model/alertModel.cjs');
const Notification = require('../model/notificationModel.cjs');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { calculateDistance, isWithinOfficeRange } = require('../utils/locationUtils.cjs');
const { officeLocation, maxAllowedDistance } = require('../config/locationConfig.cjs');
const Location = require('../model/locationModel.cjs');
// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // Use your SMTP service
    auth: {
        user: process.env.EMAIL_USER, // Add to .env
        pass: process.env.EMAIL_PASS  // Add to .env
    }
});

// Existing routes
router.post('/login', authController.login);
router.post('/admin/login', authController.loginUser);
router.get('/test-connection', async (req, res) => {
    try {
        const users = await User.find({}).select('email -_id').limit(5);
        const totalCount = await User.countDocuments({});
        if (users && users.length > 0) {
            return res.status(200).json({
                success: true,
                message: 'Successfully connected to the database and retrieved users',
                totalUsersInDatabase: totalCount,
                sampleSize: users.length,
                sampleUsers: users.map(user => ({ email: user.email }))
            });
        } else {
            return res.status(200).json({
                success: true,
                message: 'Connected to database but no users found in the collection',
                totalUsersInDatabase: 0
            });
        }
    } catch (error) {
        console.error('Database test error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error testing database connection',
            error: error.message
        });
    }
});

router.get('/check-email/:email', async (req, res) => {
    try {
        const { email } = req.params;
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email parameter is required'
            });
        }
        const user = await User.findOne({ email }).select('email -_id');
        if (user) {
            return res.status(200).json({
                success: true,
                message: 'Email exists in the database',
                exists: true
            });
        } else {
            return res.status(200).json({
                success: true,
                message: 'Email does not exist in the database',
                exists: false
            });
        }
    } catch (error) {
        console.error('Email check error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking email in database',
            error: error.message
        });
    }
});

router.post('/register', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword, role: role || 'user' });
        await newUser.save();
        res.status(201).json({
            success: true,
            message: 'User registered successfully'
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Error registering user',
            error: error.message
        });
    }
});

// New alert endpoint
router.post('/alert-out-of-range', async (req, res) => {
    try {
        const { userId, location } = req.body;
        if (!userId || !location || !location.latitude || !location.longitude) {
            return res.status(400).json({
                success: false,
                message: 'User ID and location are required'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const distance = Math.round(isWithinOfficeRange(
            location.latitude,
            location.longitude,
            officeLocation.latitude,
            officeLocation.longitude,
            Infinity
        ));

        if (distance <= maxAllowedDistance) {
            return res.status(400).json({
                success: false,
                message: 'User is within office range'
            });
        }

        // Log alert
        const alert = new Alert({
            userId,
            message: `User ${user.email} moved ${distance}m away from office`,
            location: {
                latitude: location.latitude,
                longitude: location.longitude,
                distance
            }
        });
        await alert.save();

        // Create notification for the user
        const userNotification = new Notification({
            userId,
            message: `You are ${distance}m away from the office. Please return to the office area.`,
            alertId: alert._id
        });
        await userNotification.save();

        // Find admin to create admin notification
        const admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            console.warn('No admin found for notification');
        } else {
            // Create notification for admin
            const adminNotification = new Notification({
                userId: admin._id,
                message: `User ${user.email} has moved ${distance}m away from the office at ${new Date().toLocaleString()}.`,
                alertId: alert._id
            });
            await adminNotification.save();
        }

        res.status(200).json({
            success: true,
            message: 'Alert processed and notifications sent',
            alert: alert._id,
            notification: userNotification._id
        });
    } catch (error) {
        console.error('Alert error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing alert',
            error: error.message
        });
    }
});
// Backend/routes/authroutes.cjs
// ... (other imports and routes)
router.post('/store-location', async (req, res) => {
  try {
    const { userId, location } = req.body;
    const { latitude, longitude } = location || {};

    if (!userId || !location || latitude === undefined || longitude === undefined) {
      console.warn('Invalid store-location request:', req.body);
      return res.status(400).json({
        success: false,
        message: 'User ID and location (latitude, longitude) are required',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.warn('User not found for userId:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Calculate distance from office
    const distance = Math.round(
      calculateDistance(
        latitude,
        longitude,
        officeLocation.latitude,
        officeLocation.longitude
      )
    );

    // Check if user is within office range
    const isInOffice = distance <= maxAllowedDistance;
    
    // Save location
    console.log('Saving location:', { userId, latitude, longitude, distance, isInOffice });
    const locationEntry = new Location({
      userId,
      location: { latitude, longitude },
      distance,
      isInOffice,
    });
    await locationEntry.save();
    console.log('Location saved successfully');

    res.status(200).json({
      success: true,
      message: 'Location stored successfully',
      isInOffice,
      distance,
    });
  } catch (error) {
    console.error('Store location error:', error);
    res.status(500).json({
      success: false,
      message: 'Error storing location',
      error: error.message,
    });
  }
});
module.exports = router;