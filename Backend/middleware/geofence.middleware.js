const { isWithinGeofence, getNearestGeofence } = require('../utils/geofence');

/**
 * Middleware to check if user is within geofence
 * This middleware expects latitude and longitude in the request body
 */
const checkGeofence = (req, res, next) => {
  const { latitude, longitude } = req.body;
  
  if (!latitude || !longitude) {
    return res.status(400).json({ 
      message: 'Location data required',
      isWithinGeofence: false
    });
  }
  
  // Check if location is within geofence
  const withinGeofence = isWithinGeofence(latitude, longitude);
  
  // Get nearest geofence and distance
  const { fence, distance } = getNearestGeofence(latitude, longitude);
  
  // Add geofence info to request
  req.geofenceInfo = {
    isWithinGeofence: withinGeofence,
    nearestFence: fence,
    distance: distance
  };
  
  next();
};

/**
 * Middleware to require user to be within geofence
 * Must be used after checkGeofence middleware
 */
const requireGeofence = (req, res, next) => {
  if (!req.geofenceInfo) {
    return res.status(500).json({ 
      message: 'Geofence check not performed',
      isWithinGeofence: false
    });
  }
  
  if (!req.geofenceInfo.isWithinGeofence) {
    return res.status(403).json({ 
      message: 'You must be within the designated area to perform this action',
      isWithinGeofence: false,
      nearestFence: req.geofenceInfo.nearestFence,
      distance: req.geofenceInfo.distance
    });
  }
  
  next();
};

module.exports = {
  checkGeofence,
  requireGeofence
};