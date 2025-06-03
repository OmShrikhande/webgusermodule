const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String 
    },
    assignedTo: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    assignedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    dueDate: { 
        type: Date, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
        default: 'Pending'
    },
    priority: { 
        type: String, 
        enum: ['Low', 'Medium', 'High'],
        default: 'Medium'
    },
    isRead: { 
        type: Boolean, 
        default: false 
    },
    completedAt: { 
        type: Date 
    }
}, { 
    collection: 'tasks',
    timestamps: true
});

module.exports = mongoose.model('Task', taskSchema);