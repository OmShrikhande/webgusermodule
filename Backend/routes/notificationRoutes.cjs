const express = require('express');
const router = express.Router();
const Notification = require('../model/notificationModel.cjs');
const { authenticateToken } = require('../middleware/auth.cjs');
const axios = require('axios');

// Get all notifications for a user
router.get('/notifications/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const notifications = await Notification.find({ userId })
            .sort({ timestamp: -1 });
        
        return res.status(200).json({
            success: true,
            notifications
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching notifications',
            error: error.message
        });
    }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', async (req, res) => {
    try {
        const { notificationId } = req.params;
        
        const notification = await Notification.findByIdAndUpdate(
            notificationId,
            { isRead: true },
            { new: true }
        );
        
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }
        
        return res.status(200).json({
            success: true,
            notification
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return res.status(500).json({
            success: false,
            message: 'Error marking notification as read',
            error: error.message
        });
    }
});

// Register a device for push notifications
router.post('/register-device', authenticateToken, async (req, res) => {
    try {
        const { userId, pushToken, deviceInfo } = req.body;
        
        // Validate user ID from token matches request
        if (req.user.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: User ID mismatch',
            });
        }
        
        // Create a notification to confirm registration
        const notification = new Notification({
            userId,
            message: 'Device registered for location tracking notifications',
            timestamp: new Date(),
            data: { type: 'device_registration', deviceInfo }
        });
        
        await notification.save();
        
        return res.status(201).json({
            success: true,
            message: 'Device registered successfully',
            notification
        });
    } catch (error) {
        console.error('Error registering device:', error);
        return res.status(500).json({
            success: false,
            message: 'Error registering device',
            error: error.message,
        });
    }
});

// Send tracking reminder notification
router.post('/send-tracking-reminder', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.body;
        
        // Only allow admins or the user themselves to send reminders
        if (req.user.userId !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: Cannot send notifications to other users',
            });
        }
        
        // Create a notification in the database
        const notification = new Notification({
            userId,
            message: 'Location tracking reminder: Please keep the app running for continuous tracking',
            timestamp: new Date(),
            data: { type: 'tracking_reminder' }
        });
        
        await notification.save();
        
        return res.status(200).json({
            success: true,
            message: 'Tracking reminder notification created',
            notification
        });
    } catch (error) {
        console.error('Error sending tracking reminder:', error);
        return res.status(500).json({
            success: false,
            message: 'Error sending tracking reminder',
            error: error.message,
        });
    }
});

// Schedule periodic tracking reminders
router.post('/schedule-tracking-reminders', authenticateToken, async (req, res) => {
    try {
        const { userId, intervalMinutes = 30 } = req.body;
        
        // Only allow admins or the user themselves
        if (req.user.userId !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: Cannot schedule notifications for other users',
            });
        }
        
        // Create a notification to confirm scheduling
        const notification = new Notification({
            userId,
            message: `Location tracking reminders scheduled every ${intervalMinutes} minutes`,
            timestamp: new Date(),
            data: { 
                type: 'tracking_reminder_schedule',
                intervalMinutes
            }
        });
        
        await notification.save();
        
        return res.status(200).json({
            success: true,
            message: 'Tracking reminders scheduled',
            notification,
            intervalMinutes
        });
    } catch (error) {
        console.error('Error scheduling tracking reminders:', error);
        return res.status(500).json({
            success: false,
            message: 'Error scheduling tracking reminders',
            error: error.message,
        });
    }
});

module.exports = router;