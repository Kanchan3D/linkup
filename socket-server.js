const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS configuration for socket server
const io = socketIo(server, {
  cors: {
    origin: [
      "https://linkupguys.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: [
    "https://linkupguys.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000"
  ],
  credentials: true
}));

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "LinkUp Socket Server Running",
    timestamp: new Date().toISOString(),
    connected: io.engine.clientsCount
  });
});

app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy",
    uptime: process.uptime(),
    connected: io.engine.clientsCount
  });
});

// Socket.IO setup
const rooms = new Map(); // Store room participants

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // Join a meeting room
  socket.on("joinRoom", ({ roomId, user }) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.user = user;

    // Add user to room participants with socket ID
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    rooms.get(roomId).set(socket.id, { ...user, socketId: socket.id });

    // Notify others about new participant
    socket.to(roomId).emit("userJoined", { ...user, socketId: socket.id });

    // Send current participants list to the new user
    const participants = Array.from(rooms.get(roomId).values()).filter(
      (participant) => participant.id !== user.id
    );
    socket.emit("participantsList", participants);

    console.log(`${user.name} (${socket.id}) joined room ${roomId}`);
  });

  // WebRTC signaling
  socket.on("offer", ({ offer, to, from }) => {
    socket.to(to).emit("offer", { offer, from: socket.id, fromUser: from });
  });

  socket.on("answer", ({ answer, to, from }) => {
    socket.to(to).emit("answer", { answer, from: socket.id, fromUser: from });
  });

  socket.on("ice-candidate", ({ candidate, to, from }) => {
    socket.to(to).emit("ice-candidate", { candidate, from: socket.id, fromUser: from });
  });

  // Chat messages
  socket.on("sendMessage", ({ roomId, message, user }) => {
    const messageData = {
      id: Date.now().toString(),
      text: message,
      user: user,
      timestamp: new Date().toISOString()
    };
    
    // Broadcast to all users in the room
    io.to(roomId).emit("newMessage", messageData);
    console.log(`Message in room ${roomId} from ${user.name}: ${message}`);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
    
    if (socket.roomId && rooms.has(socket.roomId)) {
      rooms.get(socket.roomId).delete(socket.id);
      
      // Notify others about user leaving
      socket.to(socket.roomId).emit("userLeft", { socketId: socket.id });
      
      // Clean up empty rooms
      if (rooms.get(socket.roomId).size === 0) {
        rooms.delete(socket.roomId);
      }
      
      console.log(`User ${socket.id} left room ${socket.roomId}`);
    }
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
