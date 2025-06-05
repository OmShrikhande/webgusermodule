// server.cjs
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db.cjs');
const authRoutes = require('./routes/authroutes.cjs');
const notificationRoutes = require('./routes/notificationRoutes.cjs');
const taskRoutes = require('./routes/taskRoutes.cjs');
const visitLocationRoutes = require('./routes/visitLocationRoutes.cjs');
const imageUploadRoutes = require('./routes/imageUploadRoutes.cjs');

const app = express();

app.use(cors());
// Increase payload limit for image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded images
app.use('/uploads', express.static('uploads'));

connectDB();

app.use('/api', authRoutes);
app.use('/api', notificationRoutes);
app.use('/api', taskRoutes);
app.use('/api', visitLocationRoutes);
app.use('/api', imageUploadRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});