const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const roomRoutes = require("./routes/rooms");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

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
  res.json({ message: "Linkup API is running!" });
});

// Export for Vercel
module.exports = app;
