const rooms = new Map(); // Store room participants
const Message = require("../models/Message");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // Join a meeting room
    socket.on("joinRoom", ({ roomId, user }) => {
      try {
        if (!roomId || !user) {
          console.error("Invalid joinRoom data:", { roomId, user });
          return;
        }

        // Ensure user has required fields
        const userData = {
          id: user.id || socket.id,
          name: user.name || 'Anonymous User',
          email: user.email || '',
          ...user
        };

        socket.join(roomId);
        socket.roomId = roomId;
        socket.user = userData;

        // Add user to room participants with socket ID
        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Map());
        }
        rooms.get(roomId).set(socket.id, { ...userData, socketId: socket.id });

        // Notify others about new participant
        socket.to(roomId).emit("userJoined", { ...userData, socketId: socket.id });

        // Send current participants list to the new user
        const participants = Array.from(rooms.get(roomId).values()).filter(
          (participant) => participant.id !== userData.id
        );
        socket.emit("participantsList", participants);

        console.log(`${userData.name} (${socket.id}) joined room ${roomId}`);
      } catch (error) {
        console.error("Error in joinRoom:", error);
      }
    });

    // Leave a meeting room
    socket.on("leaveRoom", ({ roomId, user }) => {
      try {
        const roomIdToLeave = roomId || socket.roomId;
        const userToLeave = user || socket.user;

        if (!roomIdToLeave || !userToLeave) {
          console.error("Invalid leaveRoom data:", { roomId: roomIdToLeave, user: userToLeave });
          return;
        }

        socket.leave(roomIdToLeave);
        
        if (rooms.has(roomIdToLeave)) {
          rooms.get(roomIdToLeave).delete(socket.id);
          if (rooms.get(roomIdToLeave).size === 0) {
            rooms.delete(roomIdToLeave);
          }
        }

        socket.to(roomIdToLeave).emit("userLeft", { ...userToLeave, socketId: socket.id });
        console.log(`${userToLeave.name || 'Unknown'} (${socket.id}) left room ${roomIdToLeave}`);
      } catch (error) {
        console.error("Error in leaveRoom:", error);
      }
    });

    // Handle text messages
    socket.on("sendMessage", async (message) => {
      try {
        if (!message || !message.roomId || !message.text || !message.senderId) {
          console.error("Invalid message data:", message);
          return;
        }

        // Get sender name from socket user data or message data
        const senderName = message.senderName || socket.user?.name || 'Anonymous';

        // Save message to database
        const newMessage = new Message({
          roomId: message.roomId,
          senderId: message.senderId,
          senderName: senderName,
          text: message.text,
          type: message.type || 'text',
          timestamp: new Date()
        });

        await newMessage.save();
        console.log(`Message sent and saved in room ${message.roomId}: ${message.text}`);

        // Broadcast message to all users in the room
        io.to(message.roomId).emit("newMessage", {
          ...message,
          senderName: senderName,
          _id: newMessage._id,
          timestamp: newMessage.timestamp.toISOString(),
        });
      } catch (error) {
        console.error("Error handling sendMessage:", error);
      }
    });

    // Handle file sharing
    socket.on("shareFile", async (fileData) => {
      try {
        if (!fileData || !fileData.roomId || !fileData.fileName) {
          console.error("Invalid file data:", fileData);
          return;
        }

        // Get sender name from socket user data or file data
        const senderName = fileData.senderName || socket.user?.name || 'Anonymous';

        // Save file message to database
        const fileMessage = new Message({
          roomId: fileData.roomId,
          senderId: fileData.senderId,
          senderName: senderName,
          type: 'file',
          text: fileData.fileName,
          fileData: {
            fileName: fileData.fileName,
            fileSize: fileData.fileSize,
            fileType: fileData.fileType,
            fileUrl: fileData.fileUrl
          },
          timestamp: new Date()
        });

        await fileMessage.save();
        console.log(`File shared and saved in room ${fileData.roomId}: ${fileData.fileName}`);

        // Broadcast file to all users in the room
        io.to(fileData.roomId).emit("fileShared", {
          ...fileData,
          senderName: senderName,
          _id: fileMessage._id,
          timestamp: fileMessage.timestamp.toISOString(),
        });
      } catch (error) {
        console.error("Error handling shareFile:", error);
      }
    });

    // Handle typing indicators
    socket.on("typing", ({ roomId, userId, userName, isTyping }) => {
      socket.to(roomId).emit("userTyping", { userId, userName, isTyping });
    });

    // WebRTC Signaling Events
    socket.on("offer", ({ offer, to, from }) => {
      if (!offer || !to || !from) {
        console.error("Invalid offer data");
        return;
      }
      console.log(`Forwarding offer from ${from} to ${to}`);
      const targetSocket = io.sockets.sockets.get(to);
      if (targetSocket) {
        targetSocket.emit("offer", { offer, from });
        console.log(`Offer sent to ${to}`);
      } else {
        console.error(`Target socket ${to} not found`);
      }
    });

    socket.on("answer", ({ answer, to, from }) => {
      if (!answer || !to || !from) {
        console.error("Invalid answer data");
        return;
      }
      console.log(`Forwarding answer from ${from} to ${to}`);
      const targetSocket = io.sockets.sockets.get(to);
      if (targetSocket) {
        targetSocket.emit("answer", { answer, from });
        console.log(`Answer sent to ${to}`);
      } else {
        console.error(`Target socket ${to} not found`);
      }
    });

    socket.on("ice-candidate", ({ candidate, to, from }) => {
      if (!candidate || !to || !from) {
        console.error("Invalid ice-candidate data");
        return;
      }
      console.log(`Forwarding ICE candidate from ${from} to ${to}`);
      const targetSocket = io.sockets.sockets.get(to);
      if (targetSocket) {
        targetSocket.emit("ice-candidate", { candidate, from });
        console.log(`ICE candidate sent to ${to}`);
      } else {
        console.error(`Target socket ${to} not found`);
      }
    });

    // Request existing users when joining
    socket.on("request-users", ({ roomId }) => {
      if (!roomId) {
        return;
      }
      
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
        console.log(`${socket.user.name || 'Unknown'} (${socket.id}) disconnected from room ${socket.roomId}`);
      }
    });
  });
};
