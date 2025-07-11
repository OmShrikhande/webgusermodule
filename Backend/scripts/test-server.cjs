// test-server.cjs
require('dotenv').config();
const express = require('express');

const app = express();

// Add a simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Add a test endpoint
app.get('/', (req, res) => {
  res.status(200).send('Test server is running');
});

// Log environment variables (without sensitive values)
console.log('Environment variables:');
console.log('- PORT:', process.env.PORT || '(not set)');
console.log('- NODE_ENV:', process.env.NODE_ENV || '(not set)');
console.log('- MONGO_URI:', process.env.MONGO_URI ? 'defined' : 'not defined');
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? 'defined' : 'not defined');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
});