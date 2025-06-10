const mongoose = require('mongoose');

const visitLocationSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    location: {
        address: { 
            type: String, 
            required: false 
        },
        latitude: { 
            type: Number 
        },
        longitude: { 
            type: Number 
        }
    },
    visitStatus: { 
        type: String, 
        enum: ['pending', 'reached', 'in-progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    visitDate: { 
        type: Date 
    },
    autoCompleted: {
        type: Boolean,
        default: false
    },
    notificationSent: { 
        type: Boolean, 
        default: false 
    },
    notificationTime: { 
        type: Date 
    },
    adminNotes: { 
        type: String, 
        default: '' 
    },
    userFeedback: { 
        type: String, 
        default: '' 
    },
    isRead: { 
        type: Boolean, 
        default: false 
    },
    images: [{
       data:Buffer,
        type: { 
            type: String, 
            enum: ['start', 'complete'],
            required: true 
        },
        timestamp: { 
            type: Date, 
            default: Date.now 
        },
        location: {
            latitude: { 
                type: Number 
            },
            longitude: { 
                type: Number 
            }
        }
    }]
}, { 
    collection: 'visitlocations',
    timestamps: true
});

module.exports = mongoose.model('VisitLocation', visitLocationSchema);