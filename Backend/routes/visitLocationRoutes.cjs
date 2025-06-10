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
        const { visitStatus, userFeedback, userLocation, autoCompleted } = req.body;

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

            // For auto-completion, allow completion within 50m radius
            // For manual completion, keep the original distance check
            const allowedDistance = autoCompleted ? 50 : maxAllowedDistance;
            
            if (distance > allowedDistance) {
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
            // Mark if this was auto-completed
            if (autoCompleted) {
                visitLocation.autoCompleted = true;
                console.log(`✅ Auto-completing task ${visitLocationId} for user at distance: ${Math.round(distance)}m`);
            } else {
                console.log(`📝 Manual completion of task ${visitLocationId}`);
            }
        }
        await visitLocation.save();
        
        console.log(`💾 Task ${visitLocationId} status updated to: ${visitStatus}`);

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
            timestamp: new Date(),
            data: {
                type: 'visit_assignment',
                visitLocationId: visitLocation._id,
                address: location.address,
                coordinates: {
                    latitude: location.latitude,
                    longitude: location.longitude
                },
                adminNotes: adminNotes,
                visitDate: visitDate
            }
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

// Auto-complete visit locations based on user proximity
router.post('/check-visit-locations', authenticateToken, async (req, res) => {
    try {
        const { userId, location } = req.body;
        
        console.log('Check visit locations request:', { 
            userId, 
            location, 
            userFromToken: req.user?.userId 
        });
        
        // Validate userId
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        
        // Validate location
        if (!location || !location.latitude || !location.longitude) {
            return res.status(400).json({
                success: false,
                message: 'Location coordinates are required'
            });
        }

        // Ensure the user can only check their own visit locations
        if (req.user.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Cannot check visit locations for other users'
            });
        }

        // Find all pending or in-progress visit locations for this user
        const pendingVisits = await VisitLocation.find({ 
            userId: userId,
            visitStatus: { $in: ['pending', 'in-progress'] }
        });

        const completedVisits = [];
        const autoStartedVisits = [];

        for (const visit of pendingVisits) {
            if (visit.location && visit.location.latitude && visit.location.longitude) {
                const distance = calculateDistance(
                    location.latitude,
                    location.longitude,
                    visit.location.latitude,
                    visit.location.longitude
                );

                // If user is within 50 meters of the assigned location
                if (distance <= maxAllowedDistance) {
                    if (visit.visitStatus === 'pending') {
                        // Auto-start the visit
                        visit.visitStatus = 'in-progress';
                        visit.visitDate = new Date();
                        await visit.save();
                        autoStartedVisits.push({
                            visitId: visit._id,
                            address: visit.location.address,
                            distance: Math.round(distance),
                            action: 'started'
                        });
                    } else if (visit.visitStatus === 'in-progress') {
                        // Auto-complete the visit
                        visit.visitStatus = 'completed';
                        visit.visitDate = new Date();
                        await visit.save();
                        
                        // Create completion notification
                        const notification = new Notification({
                            userId: userId,
                            message: `Visit to ${visit.location.address} completed automatically`,
                            timestamp: new Date()
                        });
                        await notification.save();
                        
                        completedVisits.push({
                            visitId: visit._id,
                            address: visit.location.address,
                            distance: Math.round(distance),
                            action: 'completed'
                        });
                    }
                }
            }
        }

        return res.status(200).json({
            success: true,
            completedVisits,
            autoStartedVisits,
            message: `${completedVisits.length} visits completed, ${autoStartedVisits.length} visits started automatically`
        });

    } catch (error) {
        console.error('Error checking visit locations:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking visit locations',
            error: error.message
        });
    }
});

// Test endpoint to verify authentication
router.get('/test-auth', authenticateToken, async (req, res) => {
    try {
        console.log('Test auth - User object:', req.user);
        return res.status(200).json({
            success: true,
            message: 'Authentication successful',
            user: req.user,
            userId: req.user.userId,
            tokenFormat: req.user.id ? 'old' : 'new'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Test failed',
            error: error.message
        });
    }
});

// Delete a visit location (for admin)
router.delete('/visit-locations/:visitLocationId', authenticateToken, async (req, res) => {
    try {
        const { visitLocationId } = req.params;
        
        // Find the visit location to get userId before deletion
        const visitLocation = await VisitLocation.findById(visitLocationId);
        
        if (!visitLocation) {
            return res.status(404).json({
                success: false,
                message: 'Visit location not found'
            });
        }
        
        // Store userId for notification
        const userId = visitLocation.userId;
        const locationAddress = visitLocation.location?.address || 'Unknown location';
        
        // Delete the visit location
        await VisitLocation.findByIdAndDelete(visitLocationId);
        
        // Create notification about the deletion
        const notification = new Notification({
            userId: userId,
            message: `Visit assignment removed: ${locationAddress}`,
            timestamp: new Date(),
            data: {
                type: 'visit_deletion',
                visitLocationId: visitLocationId,
                address: locationAddress
            }
        });
        
        await notification.save();
        
        return res.status(200).json({
            success: true,
            message: 'Visit location deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting visit location:', error);
        return res.status(500).json({
            success: false,
            message: 'Error deleting visit location',
            error: error.message
        });
    }
});

module.exports = router;