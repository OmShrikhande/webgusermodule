const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const VisitLocation = require('../model/visitLocationModel.cjs');
const { authenticateToken } = require('../middleware/auth.cjs');

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload image for visit location
router.post('/visit-locations/:visitLocationId/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { visitLocationId } = req.params;
        const { imageType, timestamp, location } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        // Find the visit location
        const visitLocation = await VisitLocation.findById(visitLocationId);
        if (!visitLocation) {
            return res.status(404).json({
                success: false,
                message: 'Visit location not found'
            });
        }

        // Create image object with binary data
        const imageObj = {
            data: req.file.buffer, // Save image as Buffer in DB
            type: imageType,
            timestamp: timestamp ? new Date(timestamp) : new Date(),
            location: location ? JSON.parse(location) : undefined
        };

        visitLocation.images.push(imageObj);
        await visitLocation.save();

        res.json({ success: true, message: 'Image uploaded and saved in database.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

module.exports = router;