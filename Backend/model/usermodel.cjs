const mongoose = require('mongoose');

/**
 * User Schema - Maps to the 'user' collection in the 'adminlogin' database
 * This schema is used only for authentication purposes
 * 
 * The collection contains user credentials (email and password)
 * When a user attempts to log in, their credentials are checked against this collection
 */
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}, { 
    collection: 'users',  // Explicitly set collection name
    timestamps: false    // Don't add createdAt/updatedAt fields
});

module.exports = mongoose.model('User', userSchema);