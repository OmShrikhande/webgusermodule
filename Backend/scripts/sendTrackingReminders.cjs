// Backend/scripts/sendTrackingReminders.cjs
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../model/usermodel.cjs');
const Notification = require('../model/notificationModel.cjs');
const connectDB = require('../config/db.cjs');

// Connect to database
connectDB();

async function sendTrackingReminders() {
  try {
    console.log('Starting tracking reminder job...');
    
    // Get all active users
    const users = await User.find({ isActive: true });
    console.log(`Found ${users.length} active users`);
    
    let successCount = 0;
    
    // Create a tracking reminder notification for each user
    for (const user of users) {
      try {
        const notification = new Notification({
          userId: user._id,
          message: 'Location tracking reminder: Please ensure the app is running for continuous tracking',
          timestamp: new Date(),
          data: { type: 'tracking_reminder' }
        });
        
        await notification.save();
        successCount++;
      } catch (error) {
        console.error(`Error creating notification for user ${user._id}:`, error);
      }
    }
    
    console.log(`Successfully sent ${successCount} tracking reminders`);
    
    // In a real implementation, you would use Firebase Admin SDK or Expo Push API
    // to send push notifications to all registered devices
    console.log('Note: This script only creates database notifications. To send actual push notifications, implement the push notification service.');
    
    return { success: true, count: successCount };
  } catch (error) {
    console.error('Error sending tracking reminders:', error);
    return { success: false, error: error.message };
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  sendTrackingReminders()
    .then(result => {
      console.log('Job completed:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Job failed:', error);
      process.exit(1);
    });
} else {
  // Export for use in other modules
  module.exports = sendTrackingReminders;
}