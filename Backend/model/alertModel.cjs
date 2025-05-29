const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    message: { type: String, required: true },
    location: {
        latitude: { type: Number },
        longitude: { type: Number },
        distance: { type: Number }
    },
    timestamp: { type: Date, default: Date.now }
}, { 
    collection: 'alerts',
    timestamps: true
});

module.exports = mongoose.model('Alert', alertSchema);