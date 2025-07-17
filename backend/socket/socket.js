module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join-room", ({ roomId, user }) => {
      socket.join(roomId);
      socket.to(roomId).emit("user-joined", user);
    });

    socket.on("send-message", ({ roomId, user, text }) => {
      io.to(roomId).emit("receive-message", { user, text });
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
};
