const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Connect to the adminlogin database
        await mongoose.connect('mongodb://localhost:27017/adminlogin', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
        });
        
        console.log('Connected to MongoDB adminlogin database');
        
        // Verify that we can access the users collection
        const collections = await mongoose.connection.db.listCollections().toArray();
        const hasUserCollection = collections.some(collection => collection.name === 'users');
        
        if (!hasUserCollection) {
            console.warn('Warning: The "users" collection does not exist in the adminlogin database');
            console.warn('Login functionality will not work until the collection is created');
        } else {
            console.log('Successfully connected to the "users" collection');
        }
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

module.exports = connectDB;