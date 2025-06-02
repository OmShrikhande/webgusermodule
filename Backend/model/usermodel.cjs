const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    name: { type: String, default: '' },
    profileImage: { type: String, default: '' }, // Base64 encoded image or URL
    joinDate: { type: Date, default: Date.now },
    lastLoginTime: { type: Date },
    lastLogoutTime: { type: Date }
}, { 
    collection: 'users',
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);