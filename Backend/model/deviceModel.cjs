const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  pushToken: {
    type: String,
    required: true,
  },
  deviceInfo: {
    platform: String,
    model: String,
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
}, {
  collection: 'devices',
  timestamps: true,
});

// Ensure we don't have duplicate tokens for the same user
deviceSchema.index({ userId: 1, pushToken: 1 }, { unique: true });

module.exports = mongoose.model('Device', deviceSchema);