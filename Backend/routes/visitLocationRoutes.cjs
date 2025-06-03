const express = require('express');
const router = express.Router();
const VisitLocation = require('../model/visitLocationModel.cjs');
const Notification = require('../model/notificationModel.cjs');
const { authenticateToken } = require('../middleware/auth.cjs');
const { calculateDistance } = require('../utils/locationUtils.cjs');
const { maxAllowedDistance } = require('../config/locationConfig.cjs');

// Get all visit locations assigned to a user
router.get('/visit-locations/assigned/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        
        const visitLocations = await VisitLocation.find({ userId: userId })
            .sort({ createdAt: -1 });
        
        return res.status(200).json({
            success: true,
            visitLocations
        });
    } catch (error) {
        console.error('Error fetching assigned visit locations:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching assigned visit locations',
            error: error.message
        });
    }
});

// Get unread visit locations count for a user
router.get('/visit-locations/unread-count/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        
        const unreadCount = await VisitLocation.countDocuments({ 
            userId: userId, 
            isRead: false 
        });
        
        return res.status(200).json({
            success: true,
            unreadCount
        });
    } catch (error) {
        console.error('Error fetching unread visit locations count:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching unread visit locations count',
            error: error.message
        });
    }
});

// Mark visit location as read
router.put('/visit-locations/:visitLocationId/read', authenticateToken, async (req, res) => {
    try {
        const { visitLocationId } = req.params;
        
        const visitLocation = await VisitLocation.findByIdAndUpdate(
            visitLocationId,
            { isRead: true },
            { new: true }
        );
        
        if (!visitLocation) {
            return res.status(404).json({
                success: false,
                message: 'Visit location not found'
            });
        }
        
        return res.status(200).json({
            success: true,
            visitLocation
        });
    } catch (error) {
        console.error('Error marking visit location as read:', error);
        return res.status(500).json({
            success: false,
            message: 'Error marking visit location as read',
            error: error.message
        });
    }
});

// Update visit location status
router.put('/visit-locations/:visitLocationId/status', authenticateToken, async (req, res) => {
    try {
        const { visitLocationId } = req.params;
        const { visitStatus, userFeedback, userLocation } = req.body;

        // Find the visit location
        const visitLocation = await VisitLocation.findById(visitLocationId);
        if (!visitLocation) {
            return res.status(404).json({
                success: false,
                message: 'Visit location not found'
            });
        }

        // Only allow completion if user is at the assigned location
        if (visitStatus === 'completed') {
            if (
                !userLocation ||
                typeof userLocation.latitude !== 'number' ||
                typeof userLocation.longitude !== 'number'
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'User location (latitude, longitude) is required to complete the task.'
                });
            }

            const assigned = visitLocation.location;
            const distance = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                assigned.latitude,
                assigned.longitude
            );

            if (distance > maxAllowedDistance) {
                return res.status(400).json({
                    success: false,
                    message: `You must be at the assigned location to complete this task. Distance: ${Math.round(distance)}m`
                });
            }
        }

        // Update status and feedback
        visitLocation.visitStatus = visitStatus;
        if (userFeedback) visitLocation.userFeedback = userFeedback;
        if (visitStatus === 'completed') {
            visitLocation.visitDate = new Date();
        }
        await visitLocation.save();

        return res.status(200).json({
            success: true,
            visitLocation
        });
    } catch (error) {
        console.error('Error updating visit location status:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating visit location status',
            error: error.message
        });
    }
});

// Create a new visit location assignment (for admin)
router.post('/visit-locations', authenticateToken, async (req, res) => {
    try {
        const { userId, location, adminNotes, visitDate } = req.body;
        
        const visitLocation = new VisitLocation({
            userId,
            location,
            adminNotes,
            visitDate,
            notificationSent: true,
            notificationTime: new Date()
        });
        
        await visitLocation.save();
        
        // Create notification for the assigned user
        const notification = new Notification({
            userId: userId,
            message: `New location visit assigned: ${location.address}`,
            timestamp: new Date()
        });
        
        await notification.save();
        
        const populatedVisitLocation = await VisitLocation.findById(visitLocation._id)
            .populate('userId', 'name email');
        
        return res.status(201).json({
            success: true,
            visitLocation: populatedVisitLocation
        });
    } catch (error) {
        console.error('Error creating visit location:', error);
        return res.status(500).json({
            success: false,
            message: 'Error creating visit location',
            error: error.message
        });
    }
});

module.exports = router;