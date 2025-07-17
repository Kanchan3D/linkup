import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SOCKET_SERVER_URL = "http://localhost:5000"; // Replace with your backend URL

const useSocket = (roomId, user) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!roomId || !user) return;

    // 1. Connect
    socketRef.current = io(SOCKET_SERVER_URL, {
      query: { roomId, userName: user.name },
    });

    // 2. Emit a join event
    socketRef.current.emit("join-room", { roomId, user });

    // 3. Cleanup on unmount
    return () => {
      socketRef.current.disconnect();
    };
  }, [roomId, user]);

  return socketRef;
};

export default useSocket;
