const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        console.log('MongoDB URI:', process.env.MONGO_URI ? 'Defined' : 'Undefined');
        
        if (!process.env.MONGO_URI) {
            console.error('MONGO_URI environment variable is not defined');
            console.error('Please set the MONGO_URI environment variable in your .env file or in your hosting environment');
            return Promise.reject(new Error('MONGO_URI environment variable is not defined'));
        }
        
        // Connect to the MongoDB database using MONGO_URI from .env
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of 30s
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            family: 4 // Use IPv4, skip trying IPv6
        });
        
        console.log('Connected to MongoDB database');
        
        // Set up connection error handler
        mongoose.connection.on('error', err => {
            console.error('MongoDB connection error:', err);
        });
        
        // Set up disconnection handler
        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected. Attempting to reconnect...');
        });
        
        // Verify that we can access the users collection
        const collections = await mongoose.connection.db.listCollections().toArray();
        const hasUserCollection = collections.some(collection => collection.name === 'users');
        
        if (!hasUserCollection) {
            console.warn('Warning: The "users" collection does not exist in the database');
            console.warn('Login functionality will not work until the collection is created');
        } else {
            console.log('Successfully connected to the "users" collection');
        }
        
        return Promise.resolve();
    } catch (err) {
        console.error('MongoDB connection error:', err);
        // Don't exit the process, return a rejected promise instead
        return Promise.reject(err);
    }
};

module.exports = connectDB;