// server.cjs
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db.cjs');
const authRoutes = require('./routes/authroutes.cjs');
const notificationRoutes = require('./routes/notificationRoutes.cjs');

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.use('/api', authRoutes);
app.use('/api', notificationRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});