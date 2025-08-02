const express = require("express");
const Room = require("../models/Room");
const Message = require("../models/Message");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Create a new room
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const { roomId, name } = req.body;
    
    // Input validation
    if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
      return res.status(400).json({ message: "Valid roomId is required" });
    }
    
    if (name && typeof name !== 'string') {
      return res.status(400).json({ message: "Name must be a string" });
    }
    
    // Check if room already exists
    const existingRoom = await Room.findOne({ roomId });
    if (existingRoom) {
      return res.status(400).json({ message: "Room already exists" });
    }

    const room = new Room({
      roomId: roomId.trim(),
      name: (name && name.trim()) || "Meeting Room",
      createdBy: req.user.id,
    });

    await room.save();
    res.status(201).json({ 
      message: "Room created successfully", 
      room: {
        roomId: room.roomId,
        name: room.name,
        createdAt: room.createdAt,
      }
    });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get room details
router.get("/:roomId", authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findOne({ roomId, isActive: true })
      .populate("createdBy", "name email")
      .populate("participants.userId", "name email");

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json({
      room: {
        roomId: room.roomId,
        name: room.name,
        createdBy: room.createdBy,
        participants: room.participants,
        settings: room.settings,
        createdAt: room.createdAt,
      }
    });
  } catch (error) {
    console.error("Error fetching room:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Join a room
router.post("/:roomId/join", authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    let room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      // Create room if it doesn't exist
      room = new Room({
        roomId,
        name: "Meeting Room",
        createdBy: req.user.id,
      });
    }

    // Check if user is already in the room
    const existingParticipant = room.participants.find(
      p => p.userId && p.userId.toString() === req.user.id
    );

    if (!existingParticipant) {
      room.participants.push({
        userId: req.user.id,
        name: req.user.name,
        joinedAt: new Date(),
      });
    } else {
      // Update join time if user rejoins
      existingParticipant.joinedAt = new Date();
      existingParticipant.leftAt = undefined;
    }

    await room.save();
    res.json({ message: "Joined room successfully" });
  } catch (error) {
    console.error("Error joining room:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Leave a room
router.post("/:roomId/leave", authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const participant = room.participants.find(
      p => p.userId && p.userId.toString() === req.user.id
    );

    if (participant) {
      participant.leftAt = new Date();
    }

    await room.save();
    res.json({ message: "Left room successfully" });
  } catch (error) {
    console.error("Error leaving room:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get room messages with pagination
router.get("/:roomId/messages", authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if user has access to the room
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const messages = await Message.find({ 
      roomId, 
      isDeleted: false 
    })
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Reverse to get chronological order
    messages.reverse();

    res.json({
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: messages.length === parseInt(limit),
      }
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Save a message
router.post("/:roomId/messages", authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { type, content } = req.body;

    // Input validation
    if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
      return res.status(400).json({ message: "Valid roomId is required" });
    }
    
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ message: "Message content is required" });
    }
    
    if (content.length > 1000) {
      return res.status(400).json({ message: "Message content too long (max 1000 characters)" });
    }

    // Check if room exists
    let room = await Room.findOne({ roomId: roomId.trim(), isActive: true });
    if (!room) {
      // Auto-create room if it doesn't exist
      room = new Room({
        roomId: roomId.trim(),
        name: "Meeting Room",
        createdBy: req.user.id,
      });
      await room.save();
    }

    const message = new Message({
      roomId: roomId.trim(),
      senderId: req.user.id,
      senderName: req.user.name,
      type: type || 'text',
      content: content.trim(),
    });

    await message.save();
    res.status(201).json({ 
      message: "Message saved successfully",
      messageId: message._id 
    });
  } catch (error) {
    console.error("Error saving message:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user's rooms
router.get("/user/rooms", authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.find({
      $or: [
        { createdBy: req.user.id },
        { "participants.userId": req.user.id }
      ],
      isActive: true
    })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select("roomId name createdAt updatedAt participants");

    res.json({ rooms });
  } catch (error) {
    console.error("Error fetching user rooms:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
