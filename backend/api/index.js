const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

const authRoutes = require("../routes/auth");
const roomRoutes = require("../routes/rooms");
const connectDB = require("../config/db");

// Load environment variables
dotenv.config();

// Initialize database connection
let dbConnected = false;

// Function to ensure database connection
const ensureDBConnection = async () => {
  if (!dbConnected) {
    try {
      await connectDB();
      dbConnected = true;
      console.log("Database connected successfully");
    } catch (error) {
      console.error("Database connection failed:", error.message);
      throw error;
    }
  }
};

// Initialize DB connection
ensureDBConnection().catch(console.error);

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

// Middleware to ensure database connection
app.use('/api', async (req, res, next) => {
  try {
    await ensureDBConnection();
    next();
  } catch (error) {
    res.status(500).json({
      error: 'Database connection failed',
      message: error.message
    });
  }
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "Linkup API is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    dbConnected: dbConnected
  });
});

// Add a test endpoint for debugging
app.get("/api/test", (req, res) => {
  res.json({
    message: "API test endpoint working",
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      hasJWTSecret: !!process.env.JWT_SECRET,
      hasMongoURI: !!(process.env.MONGO_URI || process.env.MONGODB_URI),
      frontendURL: process.env.FRONTEND_URL,
      mongoUriLength: (process.env.MONGO_URI || process.env.MONGODB_URI || '').length,
      jwtSecretLength: (process.env.JWT_SECRET || '').length,
      port: process.env.PORT || 'not set'
    },
    dbConnected: dbConnected
  });
});

// Add debug endpoint for auth
app.get("/api/auth/test", (req, res) => {
  res.json({
    message: "Auth endpoint accessible",
    timestamp: new Date().toISOString(),
    dbConnected: dbConnected
  });
});

// Add a specific login debug endpoint
app.post("/api/auth/debug-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check environment
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: "JWT_SECRET not found" });
    }
    
    if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
      return res.status(500).json({ error: "MongoDB URI not found" });
    }
    
    // Check database connection
    await ensureDBConnection();
    
    // Test JWT
    const jwt = require('jsonwebtoken');
    const testToken = jwt.sign({ test: 'data' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    res.json({
      message: "Debug login test passed",
      hasEmail: !!email,
      hasPassword: !!password,
      jwtTest: "passed",
      dbConnected: dbConnected
    });
    
  } catch (error) {
    res.status(500).json({
      error: "Debug login failed",
      message: error.message,
      stack: error.stack
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body
  });
  
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Export for Vercel
module.exports = app;