const Location = require('../models/location.model');
const User = require('../models/user.model');
const { isWithinGeofence, calculateDistance } = require('../utils/geofence');

/**
 * Start tracking a user's location
 * @route POST /api/locations/start
 * @access Private
 */
const startTracking = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    
    // Check if there's an active tracking session for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingSession = await Location.findOne({
      user: req.user.id,
      date: { $gte: today },
      endTime: { $exists: false } // Session not ended
    });
    
    if (existingSession) {
      return res.status(400).json({ 
        message: 'You already have an active tracking session',
        session: existingSession
      });
    }
    
    // Check if within geofence
    const withinGeofence = isWithinGeofence(latitude, longitude);
    
    // Create new tracking session
    const newSession = new Location({
      user: req.user.id,
      locations: [{
        latitude,
        longitude,
        timestamp: new Date(),
        isWithinGeofence: withinGeofence
      }],
      startTime: new Date()
    });
    
    await newSession.save();
    
    // Update user's last location
    await User.findByIdAndUpdate(req.user.id, {
      lastLocation: {
        latitude,
        longitude,
        timestamp: new Date()
      }
    });
    
    res.status(201).json({
      message: 'Location tracking started',
      session: newSession,
      isWithinGeofence: withinGeofence
    });
  } catch (error) {
    console.error('Start tracking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Add a location point to the current tracking session
 * @route POST /api/locations/update
 * @access Private
 */
const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude, speed } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    
    // Find active tracking session
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const session = await Location.findOne({
      user: req.user.id,
      date: { $gte: today },
      endTime: { $exists: false } // Session not ended
    });
    
    if (!session) {
      return res.status(404).json({ message: 'No active tracking session found' });
    }
    
    // Check if within geofence
    const withinGeofence = isWithinGeofence(latitude, longitude);
    
    // Calculate distance from last point
    let newTotalDistance = session.totalDistance || 0;
    
    if (session.locations.length > 0) {
      const lastPoint = session.locations[session.locations.length - 1];
      const distance = calculateDistance(
        lastPoint.latitude, lastPoint.longitude,
        latitude, longitude
      );
      
      // Convert from meters to kilometers
      newTotalDistance += distance / 1000;
    }
    
    // Add new location point
    session.locations.push({
      latitude,
      longitude,
      timestamp: new Date(),
      speed: speed || 0,
      isWithinGeofence: withinGeofence
    });
    
    // Update total distance
    session.totalDistance = newTotalDistance;
    
    // Calculate average speed
    if (session.locations.length > 1) {
      const speedSum = session.locations
        .filter(loc => loc.speed)
        .reduce((sum, loc) => sum + loc.speed, 0);
      
      const speedCount = session.locations.filter(loc => loc.speed).length;
      
      if (speedCount > 0) {
        session.averageSpeed = speedSum / speedCount;
      }
    }
    
    await session.save();
    
    // Update user's last location
    await User.findByIdAndUpdate(req.user.id, {
      lastLocation: {
        latitude,
        longitude,
        timestamp: new Date()
      }
    });
    
    res.json({
      message: 'Location updated',
      totalDistance: newTotalDistance,
      averageSpeed: session.averageSpeed,
      isWithinGeofence: withinGeofence
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * End the current tracking session
 * @route POST /api/locations/end
 * @access Private
 */
const endTracking = async (req, res) => {
  try {
    // Find active tracking session
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const session = await Location.findOne({
      user: req.user.id,
      date: { $gte: today },
      endTime: { $exists: false } // Session not ended
    });
    
    if (!session) {
      return res.status(404).json({ message: 'No active tracking session found' });
    }
    
    // Update end time
    session.endTime = new Date();
    await session.save();
    
    res.json({
      message: 'Location tracking ended',
      session
    });
  } catch (error) {
    console.error('End tracking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get user's location history
 * @route GET /api/locations/history
 * @access Private
 */
const getLocationHistory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = { user: req.user.id };
    
    // Add date filters if provided
    if (startDate || endDate) {
      query.date = {};
      
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }
    
    const history = await Location.find(query).sort({ date: -1 });
    
    res.json(history);
  } catch (error) {
    console.error('Get location history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Check if user is within geofence
 * @route POST /api/locations/check-geofence
 * @access Private
 */
const checkGeofence = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    
    const withinGeofence = isWithinGeofence(latitude, longitude);
    
    // Update user's last location
    await User.findByIdAndUpdate(req.user.id, {
      lastLocation: {
        latitude,
        longitude,
        timestamp: new Date()
      }
    });
    
    res.json({
      isWithinGeofence: withinGeofence
    });
  } catch (error) {
    console.error('Check geofence error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  startTracking,
  updateLocation,
  endTracking,
  getLocationHistory,
  checkGeofence
};