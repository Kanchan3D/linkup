import axios from "../utils/axios";

const messageService = {
  // Get room messages
  getRoomMessages: async (roomId, page = 1, limit = 50) => {
    try {
      const response = await axios.get(`/rooms/${roomId}/messages`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching messages:", error);
      throw error;
    }
  },

  // Save a message
  saveMessage: async (roomId, messageData) => {
    try {
      const response = await axios.post(`/rooms/${roomId}/messages`, messageData);
      return response.data;
    } catch (error) {
      console.error("Error saving message:", error);
      throw error;
    }
  },

  // Create room
  createRoom: async (roomData) => {
    try {
      const response = await axios.post("/rooms/create", roomData);
      return response.data;
    } catch (error) {
      console.error("Error creating room:", error);
      throw error;
    }
  },

  // Join room
  joinRoom: async (roomId) => {
    try {
      const response = await axios.post(`/rooms/${roomId}/join`);
      return response.data;
    } catch (error) {
      console.error("Error joining room:", error);
      throw error;
    }
  },

  // Leave room
  leaveRoom: async (roomId) => {
    try {
      const response = await axios.post(`/rooms/${roomId}/leave`);
      return response.data;
    } catch (error) {
      console.error("Error leaving room:", error);
      throw error;
    }
  },

  // Get room details
  getRoomDetails: async (roomId) => {
    try {
      const response = await axios.get(`/rooms/${roomId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching room details:", error);
      throw error;
    }
  },

  // Get user's rooms
  getUserRooms: async () => {
    try {
      const response = await axios.get("/rooms/user/rooms");
      return response.data;
    } catch (error) {
      console.error("Error fetching user rooms:", error);
      throw error;
    }
  }
};

export default messageService;
