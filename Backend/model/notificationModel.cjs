const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    message: { 
        type: String, 
        required: true 
    },
    isRead: { 
        type: Boolean, 
        default: false 
    },
    alertId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Alert' 
    },
    timestamp: { 
        type: Date, 
        default: Date.now 
    },
    data: {
        type: Object,
        default: {}
    }
}, { 
    collection: 'notifications',
    timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);