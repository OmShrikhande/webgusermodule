// server.cjs
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const connectDB = require('./config/db.cjs');
const authRoutes = require('./routes/authroutes.cjs');
const notificationRoutes = require('./routes/notificationRoutes.cjs');
const taskRoutes = require('./routes/taskRoutes.cjs');
const visitLocationRoutes = require('./routes/visitLocationRoutes.cjs');
const imageUploadRoutes = require('./routes/imageUploadRoutes.cjs');

const app = express();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  console.log('Creating uploads directory');
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure CORS to allow requests from any origin
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Increase payload limit for image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded images
app.use('/uploads', express.static('uploads'));

// Add a simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Add a test endpoint
app.get('/', (req, res) => {
  res.status(200).send('Server is running');
});

// Connect to MongoDB
console.log('Connecting to MongoDB...');
connectDB()
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

// API routes
app.use('/api', authRoutes);
app.use('/api', notificationRoutes);
app.use('/api', taskRoutes);
app.use('/api', visitLocationRoutes);
app.use('/api', imageUploadRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Handle 404 errors
app.use((req, res) => {
  console.log(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Not Found',
    message: `The requested resource was not found: ${req.originalUrl}`
  });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Don't crash the server, just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Don't crash the server, just log the error
});