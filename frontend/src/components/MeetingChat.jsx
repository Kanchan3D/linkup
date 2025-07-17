import { useState, useEffect, useRef, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const MeetingChat = ({ socket, roomId, isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { user } = useContext(AuthContext);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    // Listen for new messages
    socket.on("newMessage", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Listen for file shares
    socket.on("fileShared", (fileData) => {
      setMessages((prev) => [...prev, fileData]);
    });

    // Listen for typing indicators
    socket.on("userTyping", ({ userId, userName, isTyping }) => {
      if (userId !== user?.id) {
        setTypingUsers((prev) => {
          if (isTyping) {
            return prev.includes(userName) ? prev : [...prev, userName];
          } else {
            return prev.filter((name) => name !== userName);
          }
        });
      }
    });

    return () => {
      socket.off("newMessage");
      socket.off("fileShared");
      socket.off("userTyping");
    };
  }, [socket, user]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    const message = {
      id: Date.now(),
      text: newMessage,
      sender: user?.name || "Anonymous",
      senderId: user?.id,
      timestamp: new Date().toISOString(),
      type: "text",
      roomId,
    };

    socket.emit("sendMessage", message);
    setNewMessage("");
    handleStopTyping();
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      socket.emit("typing", { roomId, userId: user?.id, userName: user?.name, isTyping: true });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 1000);
  };

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      socket.emit("typing", { roomId, userId: user?.id, userName: user?.name, isTyping: false });
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert("File size must be less than 5MB");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "text/plain", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      alert("Only images, text files, and PDFs are allowed");
      return;
    }

    setSelectedFile(file);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const uploadFile = async () => {
    if (!selectedFile || !socket) return;

    const reader = new FileReader();
    reader.onload = () => {
      const fileData = {
        id: Date.now(),
        type: "file",
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        fileData: reader.result,
        sender: user?.name || "Anonymous",
        senderId: user?.id,
        timestamp: new Date().toISOString(),
        roomId,
      };

      socket.emit("shareFile", fileData);
      setSelectedFile(null);
    };

    reader.readAsDataURL(selectedFile);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const downloadFile = (fileData, fileName) => {
    const link = document.createElement("a");
    link.href = fileData;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl border-l border-gray-200 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">Meeting Chat</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div 
        className={`flex-1 overflow-y-auto p-4 space-y-3 ${
          dragActive ? "bg-blue-50 border-2 border-dashed border-blue-300" : ""
        }`}
        onDrop={handleFileDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {dragActive && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="w-12 h-12 text-blue-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-blue-600 font-medium">Drop file here to share</p>
            </div>
          </div>
        )}

        {!dragActive && messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.senderId === user?.id ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                message.senderId === user?.id
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-gray-900"
              }`}
            >
              {message.type === "text" ? (
                <>
                  <p className="text-sm break-words">{message.text}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-xs ${
                      message.senderId === user?.id ? "text-indigo-200" : "text-gray-500"
                    }`}>
                      {message.sender}
                    </span>
                    <span className={`text-xs ${
                      message.senderId === user?.id ? "text-indigo-200" : "text-gray-500"
                    }`}>
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                </>
              ) : (
                <div>
                  {message.fileType?.startsWith("image/") ? (
                    <div>
                      <img
                        src={message.fileData}
                        alt={message.fileName}
                        className="max-w-full h-auto rounded cursor-pointer"
                        onClick={() => downloadFile(message.fileData, message.fileName)}
                      />
                      <p className="text-xs mt-1 opacity-75">{message.fileName}</p>
                    </div>
                  ) : (
                    <div 
                      className="flex items-center space-x-2 cursor-pointer hover:opacity-80"
                      onClick={() => downloadFile(message.fileData, message.fileName)}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium">{message.fileName}</p>
                        <p className="text-xs opacity-75">{formatFileSize(message.fileSize)}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-xs ${
                      message.senderId === user?.id ? "text-indigo-200" : "text-gray-500"
                    }`}>
                      {message.sender}
                    </span>
                    <span className={`text-xs ${
                      message.senderId === user?.id ? "text-indigo-200" : "text-gray-500"
                    }`}>
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm">
              {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* File Preview */}
      {selectedFile && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={uploadFile}
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                Send
              </button>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSendMessage} className="space-y-3">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              onBlur={handleStopTyping}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.txt,.pdf"
              onChange={(e) => handleFileSelect(e.target.files[0])}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MeetingChat;
