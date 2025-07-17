const express = require("express");
const http = require("http");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const socketIo = require("socket.io");
const os = require("os");

const authRoutes = require("./routes/auth");
const roomRoutes = require("./routes/rooms");
const connectDB = require("./config/db");
const setupSocket = require("./socket/socket");

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:5173", 
      `http://${localIP}:5173`,
      "http://localhost:3000",
      `http://${localIP}:3000`,
      /^http:\/\/192\.168\.\d+\.\d+:5173$/,
      /^http:\/\/192\.168\.\d+\.\d+:3000$/
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: [
    "http://localhost:5173", 
    `http://${localIP}:5173`,
    "http://localhost:3000",
    `http://${localIP}:3000`,
    /^http:\/\/192\.168\.\d+\.\d+:5173$/,
    /^http:\/\/192\.168\.\d+\.\d+:3000$/
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Increased limit for file uploads

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

// Socket setup
setupSocket(io);

const PORT = process.env.PORT || 8001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`Network: http://${localIP}:${PORT}`);
  console.log(`Detected IP: ${localIP}`);
});
