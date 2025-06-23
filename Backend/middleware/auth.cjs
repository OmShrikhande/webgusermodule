const jwt = require('jsonwebtoken');

// Check if JWT_SECRET is defined
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('WARNING: JWT_SECRET environment variable is not defined in auth middleware');
  console.error('Using a default secret key - THIS IS NOT SECURE FOR PRODUCTION');
  // Use a random string as a fallback, but log a warning
  const fallbackSecret = 'fallback_jwt_secret_' + Math.random().toString(36).substring(2);
  console.error('Using fallback secret. Please set JWT_SECRET in your environment variables.');
  JWT_SECRET = fallbackSecret;
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // Debug logging
  console.log('Auth header:', authHeader);
  console.log('Extracted token:', token ? `${token.substring(0, 20)}...` : 'No token');

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ 
      success: false,
      message: 'Access token required' 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Token verification failed:', err.message);
      return res.status(403).json({ 
        success: false,
        message: 'Invalid or expired token',
        error: err.message 
      });
    }
    
    // Handle both token formats for backward compatibility
    if (user.id && !user.userId) {
      user.userId = user.id;
    }
    
    console.log('Token verified successfully for user:', user.userId);
    req.user = user;
    next();
  });
};

module.exports = { authenticateToken };