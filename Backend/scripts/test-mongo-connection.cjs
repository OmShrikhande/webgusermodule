// test-mongo-connection.cjs
require('dotenv').config();
const mongoose = require('mongoose');

console.log('Testing MongoDB connection...');
console.log('MONGO_URI defined:', !!process.env.MONGO_URI);
console.log('MONGO_URI starts with:', process.env.MONGO_URI ? process.env.MONGO_URI.substring(0, 20) + '...' : 'undefined');

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s
    });
    
    console.log('Connected to MongoDB successfully!');
    
    // Test listing collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in database:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    // Test querying users collection
    const usersCollection = mongoose.connection.collection('users');
    const userCount = await usersCollection.countDocuments();
    console.log(`Number of users in database: ${userCount}`);
    
    // Close connection
    await mongoose.connection.close();
    console.log('Connection closed.');
    
    return true;
  } catch (error) {
    console.error('MongoDB connection test failed:');
    console.error(error);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('\nCould not connect to any MongoDB server.');
      console.error('Please check:');
      console.error('1. Your MongoDB Atlas cluster is running');
      console.error('2. Your IP whitelist includes 0.0.0.0/0 or the Render.com IP');
      console.error('3. Your MongoDB Atlas username and password are correct');
    }
    
    return false;
  }
}

testConnection()
  .then(success => {
    console.log(`Test ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  });