import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8001";

const useSocket = () => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Create socket connection with better configuration
    socketRef.current = io(SOCKET_URL, {
      transports: ['polling', 'websocket'], // Try polling first, then websocket
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 5
    });

    // Connection event listeners
    socketRef.current.on("connect", () => {
      console.log("Socket connected:", socketRef.current.id);
      setIsConnected(true);
    });

    socketRef.current.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      setIsConnected(false);
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setIsConnected(false);
    });

    socketRef.current.on("reconnect", (attempt) => {
      console.log("Socket reconnected after", attempt, "attempts");
      setIsConnected(true);
    });

    socketRef.current.on("reconnect_error", (error) => {
      console.error("Socket reconnection error:", error);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
  };
};

export default useSocket;
