const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    loginTime: { 
        type: Date, 
        default: Date.now 
    },
    logoutTime: { 
        type: Date, 
        default: null 
    },
    date: { 
        type: String, 
        default: () => new Date().toISOString().split('T')[0] 
    },
    status: {
        type: String,
        enum: ['present','half day', 'absent'],
        default: 'absent'
    },
    location: {
        latitude: {
            type: Number,
            required: false
        },
        longitude: {
            type: Number,
            required: false
        },
        isInOffice: {
            type: Boolean,
            default: false
        },
        distance: {
            type: Number,
            required: false
        }
    }
}, { 
    collection: 'attendance',
    timestamps: true
});

// Create a compound index to ensure a user can only have one attendance record per day
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);