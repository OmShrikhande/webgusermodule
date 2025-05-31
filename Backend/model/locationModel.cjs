// Backend/Model/locationModel.cjs
const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  timestamp: { type: Date, default: Date.now },
  distance: { type: Number },
  isInOffice: { type: Boolean, default: false },
}, {
  collection: 'locations',
  timestamps: true,
});

module.exports = mongoose.model('Location', locationSchema);