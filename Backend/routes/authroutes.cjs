const express = require('express');
const router = express.Router();
const authController = require('../Controller/userController.cjs');
const User = require('../model/usermodel.cjs');

// Only login route is available - checks credentials against the database
router.post('/login', authController.login);

// Test route to verify database connection and retrieve users
router.get('/test-connection', async (req, res) => {
    try {
        // Attempt to retrieve users from the database (limit to 5 for safety)
        const users = await User.find({}).select('email -_id').limit(5);
        
        // Get total count of users in the collection
        const totalCount = await User.countDocuments({});
        
        // Check if we got any users
        if (users && users.length > 0) {
            return res.status(200).json({
                success: true,
                message: 'Successfully connected to the database and retrieved users',
                totalUsersInDatabase: totalCount,
                sampleSize: users.length,
                // Only return email addresses for security
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

// Test route to check if a specific email exists in the database
router.get('/check-email/:email', async (req, res) => {
    try {
        const { email } = req.params;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email parameter is required'
            });
        }
        
        // Check if the email exists in the database
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

module.exports = router;