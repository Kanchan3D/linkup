const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

const authRoutes = require("../routes/auth");
const roomRoutes = require("../routes/rooms");
const connectDB = require("../config/db");

// Load environment variables
dotenv.config();

// Connect to database with error handling
let dbConnected = false;
connectDB().then(() => {
  dbConnected = true;
}).catch(err => {
  console.error("Failed to connect to MongoDB:", err.message);
});

// CORS origins configuration
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      process.env.FRONTEND_URL,
      process.env.FRONTEND_URL_2,
    ].filter(Boolean)
  : [
      "http://localhost:5173", 
      "http://localhost:3000",
      /^http:\/\/192\.168\.\d+\.\d+:5173$/,
      /^http:\/\/192\.168\.\d+\.\d+:3000$/
    ];

const app = express();

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "Linkup API is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Export for Vercel
module.exports = app;