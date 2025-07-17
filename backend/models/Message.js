const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  senderName: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["text", "file"],
    default: "text",
  },
  content: {
    text: String,
    fileName: String,
    fileType: String,
    fileSize: Number,
    fileUrl: String, // For storing file URLs if using cloud storage
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Index for efficient querying
messageSchema.index({ roomId: 1, timestamp: -1 });

module.exports = mongoose.model("Message", messageSchema);
