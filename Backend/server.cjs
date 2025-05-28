const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db.cjs');
const authRoutes = require('./routes/authroutes.cjs');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Connect to MongoDB - this connects to the 'adminlogin' database
connectDB();

// Routes - only login functionality is available
app.use('/api', authRoutes);

// Basic route to check if server is running
app.get('/', (req, res) => {
  res.json({ message: 'Authentication service is running' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Authentication server running on port ${PORT}`));