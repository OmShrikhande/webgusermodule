const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const VisitLocation = require('../model/visitLocationModel.cjs');
const { authenticateToken } = require('../middleware/auth.cjs');

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/visit-images');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        // Check file type
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

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

        // Create image object
        const imageData = {
            url: `/uploads/visit-images/${req.file.filename}`,
            type: imageType,
            timestamp: timestamp ? new Date(timestamp) : new Date()
        };

        // Add location if provided
        if (location) {
            try {
                const locationData = typeof location === 'string' ? JSON.parse(location) : location;
                if (locationData.latitude && locationData.longitude) {
                    imageData.location = {
                        latitude: locationData.latitude,
                        longitude: locationData.longitude
                    };
                }
            } catch (error) {
                console.error('Error parsing location data:', error);
            }
        }

        // Add image to visit location
        visitLocation.images.push(imageData);
        await visitLocation.save();

        return res.status(200).json({
            success: true,
            message: 'Image uploaded successfully',
            image: imageData
        });
    } catch (error) {
        console.error('Error uploading image:', error);
        return res.status(500).json({
            success: false,
            message: 'Error uploading image',
            error: error.message
        });
    }
});

module.exports = router;