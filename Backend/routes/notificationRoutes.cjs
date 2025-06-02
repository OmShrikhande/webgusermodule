const express = require('express');
const router = express.Router();
const Notification = require('../model/notificationModel.cjs');

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

module.exports = router;