/**
 * Configuration for office location and attendance settings
 */

module.exports = {
  // Office coordinates
  officeLocation: {
    latitude: 21.12354197063915,
    longitude: 79.039775255145
  },
  
  // Maximum allowed distance from office in meters (200m = ~650ft)
  maxAllowedDistance: 50,
  attendanceStartTime: '09:00', // 9:00 AM
  attendanceEndTime: '10:30',
  // Whether to enforce strict location checking
  enforceLocationCheck: true,
};