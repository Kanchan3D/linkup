const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    default: "Meeting Room",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    name: String,
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: Date,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  settings: {
    allowChat: {
      type: Boolean,
      default: true,
    },
    allowFileSharing: {
      type: Boolean,
      default: true,
    },
    maxParticipants: {
      type: Number,
      default: 50,
    },
  },
  endedAt: Date,
}, {
  timestamps: true,
});

module.exports = mongoose.model("Room", roomSchema);
