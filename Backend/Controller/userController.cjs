const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../model/usermodel.cjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if password field exists
    if (!user.password) {
      return res.status(500).json({ message: 'User account is corrupted: missing password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });

    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide both email and password' 
      });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication failed. User not found.' 
      });
    }
    // Check if password field exists
    if (!user.password) {
      return res.status(500).json({ 
        success: false, 
        message: 'User account is corrupted: missing password' 
      });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication failed. Incorrect password.' 
      });
    }
    const token = jwt.sign(
      { userId: user._id, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '1h' }
    );
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

module.exports = { login: exports.login, loginUser: exports.loginUser };