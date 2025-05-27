const geolib = require('geolib');
const dotenv = require('dotenv');

dotenv.config();

// Parse geofence locations from environment variable
const geofenceLocations = JSON.parse(process.env.GEOFENCE_LOCATIONS || '[]');
const geofenceRadius = parseInt(process.env.GEOFENCE_RADIUS || '30'); // Default 30 meters

/**
 * Check if a location is within any of the defined geofences
 * @param {number} latitude - The latitude to check
 * @param {number} longitude - The longitude to check
 * @returns {boolean} - True if within any geofence, false otherwise
 */
const isWithinGeofence = (latitude, longitude) => {
  if (!latitude || !longitude) return false;
  
  // Check each geofence location
  return geofenceLocations.some(fence => {
    const distance = geolib.getDistance(
      { latitude, longitude },
      { latitude: fence.lat, longitude: fence.lng }
    );
    
    return distance <= geofenceRadius;
  });
};

/**
 * Calculate distance between two points in meters
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} - Distance in meters
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  return geolib.getDistance(
    { latitude: lat1, longitude: lng1 },
    { latitude: lat2, longitude: lng2 }
  );
};

/**
 * Get the nearest geofence location and distance to it
 * @param {number} latitude - The latitude to check
 * @param {number} longitude - The longitude to check
 * @returns {Object} - Object containing the nearest fence and distance to it
 */
const getNearestGeofence = (latitude, longitude) => {
  if (!latitude || !longitude || geofenceLocations.length === 0) {
    return { fence: null, distance: Infinity };
  }
  
  let minDistance = Infinity;
  let nearestFence = null;
  
  geofenceLocations.forEach(fence => {
    const distance = geolib.getDistance(
      { latitude, longitude },
      { latitude: fence.lat, longitude: fence.lng }
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestFence = fence;
    }
  });
  
  return { fence: nearestFence, distance: minDistance };
};

module.exports = {
  isWithinGeofence,
  calculateDistance,
  getNearestGeofence,
  geofenceLocations,
  geofenceRadius
};