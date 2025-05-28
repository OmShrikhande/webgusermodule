const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../model/usermodel.cjs');

/**
 * Login controller - Verifies user credentials against the database
 * Checks if the provided email and password match a record in the 'user' collection
 * of the 'adminlogin' database
 */
exports.login = async (req, res) => {
    try {
        // Extract credentials from request body
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide both email and password' 
            });
        }
        
        // Check if user exists in the database
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication failed. User not found.' 
            });
        }
        
        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication failed. Incorrect password.' 
            });
        }
        
        // Generate authentication token
        const token = jwt.sign(
            { userId: user._id, email: user.email }, 
            'your_jwt_secret_key', 
            { expiresIn: '1h' }
        );
        
        // Send successful response
        res.status(200).json({ 
            success: true, 
            message: 'Login successful', 
            token, 
            user: { 
                id: user._id,
                email: user.email 
            } 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during authentication' 
        });
    }
};