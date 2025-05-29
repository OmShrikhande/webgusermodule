const express = require('express');
     const router = express.Router();
     const authController = require('../Controller/userController.cjs');
     const User = require('../model/usermodel.cjs');
     const bcrypt = require('bcryptjs');

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

     // New registration route
     router.post('/register', async (req, res) => {
         try {
             const { email, password } = req.body;
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
             const newUser = new User({ email, password: hashedPassword });
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

     module.exports = router;