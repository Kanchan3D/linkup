const rooms = new Map(); // Store room participants

module.exports = (io) => {
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

    // Leave a meeting room
    socket.on("leaveRoom", ({ roomId, user }) => {
      socket.leave(roomId);
      
      if (rooms.has(roomId)) {
        rooms.get(roomId).delete(socket.id);
        if (rooms.get(roomId).size === 0) {
          rooms.delete(roomId);
        }
      }

      socket.to(roomId).emit("userLeft", { ...user, socketId: socket.id });
      console.log(`${user.name} (${socket.id}) left room ${roomId}`);
    });

    // Handle text messages
    socket.on("sendMessage", (message) => {
      // Broadcast message to all users in the room
      io.to(message.roomId).emit("newMessage", {
        ...message,
        timestamp: new Date().toISOString(),
      });
      console.log(`Message sent in room ${message.roomId}: ${message.text}`);
    });

    // Handle file sharing
    socket.on("shareFile", (fileData) => {
      // Broadcast file to all users in the room
      io.to(fileData.roomId).emit("fileShared", {
        ...fileData,
        timestamp: new Date().toISOString(),
      });
      console.log(`File shared in room ${fileData.roomId}: ${fileData.fileName}`);
    });

    // Handle typing indicators
    socket.on("typing", ({ roomId, userId, userName, isTyping }) => {
      socket.to(roomId).emit("userTyping", { userId, userName, isTyping });
    });

    // WebRTC Signaling Events
    socket.on("offer", ({ offer, to, from }) => {
      socket.to(to).emit("offer", { offer, from });
    });

    socket.on("answer", ({ answer, to, from }) => {
      socket.to(to).emit("answer", { answer, from });
    });

    socket.on("ice-candidate", ({ candidate, to, from }) => {
      socket.to(to).emit("ice-candidate", { candidate, from });
    });

    // Request existing users when joining
    socket.on("request-users", ({ roomId }) => {
      const roomParticipants = rooms.get(roomId);
      if (roomParticipants) {
        const users = Array.from(roomParticipants.entries())
          .filter(([id, user]) => id !== socket.id)
          .map(([id, user]) => ({ socketId: id, user }));
        socket.emit("existing-users", users);
      }
    });

    // Handle legacy events for backward compatibility
    socket.on("join-room", ({ roomId, user }) => {
      socket.join(roomId);
      socket.to(roomId).emit("user-joined", user);
    });

    socket.on("send-message", ({ roomId, user, text }) => {
      io.to(roomId).emit("receive-message", { user, text });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
      
      // Clean up room data when user disconnects
      if (socket.roomId && socket.user) {
        if (rooms.has(socket.roomId)) {
          rooms.get(socket.roomId).delete(socket.id);
          if (rooms.get(socket.roomId).size === 0) {
            rooms.delete(socket.roomId);
          } else {
            // Notify remaining users
            socket.to(socket.roomId).emit("userLeft", { ...socket.user, socketId: socket.id });
          }
        }
      }
    });
  });
};
