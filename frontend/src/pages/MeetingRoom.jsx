import { useEffect, useRef, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import useSocket from "../hooks/useSocket";
import useWebRTC from "../hooks/useWebRTC";
import MeetingChat from "../components/MeetingChat";

const MeetingRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const userVideoRef = useRef(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [stream, setStream] = useState(null);
  const { user } = useContext(AuthContext);
  const { socket, isConnected } = useSocket();
  const { remoteStreams } = useWebRTC(socket, roomId, stream);

  useEffect(() => {
    const startVideo = async () => {
      try {
        // Check if mediaDevices is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Media devices not supported in this browser');
        }

        // Always request both initially, we'll control them via track.enabled
        const constraints = {
          video: true, // Always request video initially
          audio: true  // Always request audio initially
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Set the initial enabled state for tracks
        const videoTrack = mediaStream.getVideoTracks()[0];
        const audioTrack = mediaStream.getAudioTracks()[0];
        
        if (videoTrack) {
          videoTrack.enabled = isVideoEnabled;
        }
        if (audioTrack) {
          audioTrack.enabled = isAudioEnabled;
        }

        if (userVideoRef.current) {
          userVideoRef.current.srcObject = mediaStream;
        }
        setStream(mediaStream);
      } catch (err) {
        console.error("Error accessing media devices:", err);
        
        // Try with just video if audio fails
        if (err.name === 'NotFoundError' || err.message.includes('audio')) {
          try {
            const videoOnlyStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const videoTrack = videoOnlyStream.getVideoTracks()[0];
            if (videoTrack) {
              videoTrack.enabled = isVideoEnabled;
            }
            if (userVideoRef.current) {
              userVideoRef.current.srcObject = videoOnlyStream;
            }
            setStream(videoOnlyStream);
            setIsAudioEnabled(false); // No audio available
            return;
          } catch (videoErr) {
            console.error("Video-only fallback failed:", videoErr);
          }
        }
        
        // Provide more specific error messages
        if (err.name === 'NotAllowedError') {
          alert("Camera/microphone access denied. Please allow permissions and refresh the page.");
        } else if (err.name === 'NotFoundError') {
          alert("No camera/microphone found. Please connect a device and refresh the page.");
        } else if (err.name === 'NotSupportedError') {
          alert("Media devices not supported in this browser. Please use a modern browser.");
        } else {
          alert(`Could not access camera/mic: ${err.message}`);
        }
      }
    };

    // Only start video on component mount, not when toggles change
    if (!stream) {
      startVideo();
    }
  }, []); // Remove isVideoEnabled, isAudioEnabled from dependencies

  // Sync track enabled state with component state
  useEffect(() => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && videoTrack.enabled !== isVideoEnabled) {
        videoTrack.enabled = isVideoEnabled;
      }
    }
  }, [stream, isVideoEnabled]);

  useEffect(() => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack && audioTrack.enabled !== isAudioEnabled) {
        audioTrack.enabled = isAudioEnabled;
      }
    }
  }, [stream, isAudioEnabled]);

  useEffect(() => {
    if (socket && roomId) {
      // Join the room
      socket.emit("joinRoom", { roomId, user: { id: user?.id, name: user?.name } });

      // Listen for participants updates
      socket.on("userJoined", (userData) => {
        setParticipants((prev) => [...prev, userData]);
      });

      socket.on("userLeft", (userData) => {
        setParticipants((prev) => prev.filter((p) => p.id !== userData.id));
      });

      socket.on("participantsList", (participantsList) => {
        setParticipants(participantsList);
      });
    }

    return () => {
      if (socket) {
        socket.off("userJoined");
        socket.off("userLeft");
        socket.off("participantsList");
      }
    };
  }, [socket, roomId, user]);

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const newEnabled = !videoTrack.enabled;
        videoTrack.enabled = newEnabled;
        setIsVideoEnabled(newEnabled);
      }
    } else {
      // If no stream exists, just toggle the state
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const newEnabled = !audioTrack.enabled;
        audioTrack.enabled = newEnabled;
        setIsAudioEnabled(newEnabled);
      }
    } else {
      // If no stream exists, just toggle the state
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const handleLeave = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (socket) {
      socket.emit("leaveRoom", { roomId, user: { id: user?.id, name: user?.name } });
    }
    navigate("/dashboard");
  };

  const copyMeetingLink = () => {
    const meetingLink = `${window.location.origin}/meeting/${roomId}`;
    navigator.clipboard.writeText(meetingLink);
    // You could add a toast notification here
    alert("Meeting link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col relative">
      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-black/50 backdrop-blur-sm border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">Meeting Room</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <span>{participants.length + remoteStreams.size + 1} participants</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={copyMeetingLink}
            className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Copy Link</span>
          </button>
          
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm ${
              isChatOpen ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-700"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Chat</span>
          </button>
          
          <button
            onClick={handleLeave}
            className="bg-red-600 px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Leave
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 flex items-center justify-center p-4 transition-all duration-300 ${
        isChatOpen ? "mr-80" : ""
      }`}>
        <div className="w-full max-w-6xl">
          {/* Video Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* Your Video */}
            <div className="relative bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700">
              <video
                ref={userVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 object-cover"
              />
              <div className="absolute bottom-3 left-3 bg-black/50 px-2 py-1 rounded text-sm flex items-center space-x-2">
                <span>{user?.name || "You"}</span>
                {!isAudioEnabled && (
                  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1m0 0V5a2 2 0 012-2h2m0 0h8a2 2 0 012 2v8a2 2 0 01-2 2h-2m0 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v10m0 0v4m0-4h4m0 0v4" />
                  </svg>
                )}
              </div>
              {!isVideoEnabled && (
                <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                  <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* Other Participants */}
            {Array.from(remoteStreams.entries()).map(([socketId, stream], index) => (
              <div key={socketId} className="relative bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700">
                <video
                  autoPlay
                  playsInline
                  muted // Important: mute remote videos to prevent feedback
                  className="w-full h-64 object-cover"
                  ref={(video) => {
                    if (video && stream) {
                      console.log(`Setting srcObject for ${socketId}:`, stream);
                      video.srcObject = stream;
                      
                      // Add event listeners for debugging
                      video.onloadedmetadata = () => {
                        console.log(`Video metadata loaded for ${socketId}:`, {
                          videoWidth: video.videoWidth,
                          videoHeight: video.videoHeight,
                          tracks: stream.getTracks().map(t => ({
                            kind: t.kind,
                            enabled: t.enabled,
                            readyState: t.readyState,
                            label: t.label
                          }))
                        });
                        video.play().catch(e => console.error('Video play error:', e));
                      };
                      
                      video.onerror = (e) => {
                        console.error(`Video error for ${socketId}:`, e);
                      };
                      
                      video.onplay = () => {
                        console.log(`Video playing for ${socketId}`);
                      };
                    }
                  }}
                />
                <div className="absolute bottom-3 left-3 bg-black/50 px-2 py-1 rounded text-sm">
                  Participant {index + 1}
                </div>
              </div>
            ))}

            {/* Legacy participants (for users without video) */}
            {participants.filter(participant => 
              !Array.from(remoteStreams.keys()).includes(participant.socketId)
            ).map((participant, index) => (
              <div key={participant.id || participant.socketId || `participant-${index}`} className="relative bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700">
                <div className="w-full h-64 bg-gray-900 flex items-center justify-center">
                  <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 bg-black/50 px-2 py-1 rounded text-sm">
                  {participant.name}
                </div>
              </div>
            ))}

            {/* Empty slots placeholder */}
            {participants.length === 0 && remoteStreams.size === 0 && (
              <div className="bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-600 h-64 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <p>Waiting for participants...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Controls */}
      <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 transition-all duration-300 ${
        isChatOpen ? "-translate-x-40" : ""
      }`}>
        <div className="flex items-center space-x-4 bg-black/80 backdrop-blur-sm px-6 py-3 rounded-full border border-gray-700">
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-full transition-colors ${
              isAudioEnabled 
                ? "bg-gray-700 hover:bg-gray-600 text-white" 
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
            title={isAudioEnabled ? "Mute" : "Unmute"}
          >
            {isAudioEnabled ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1m0 0V5a2 2 0 012-2h2m0 0h8a2 2 0 012 2v8a2 2 0 01-2 2h-2m0 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v10m0 0v4m0-4h4m0 0v4" />
              </svg>
            )}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full transition-colors ${
              isVideoEnabled 
                ? "bg-gray-700 hover:bg-gray-600 text-white" 
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
            title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
          >
            {isVideoEnabled ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Meeting Chat */}
      <MeetingChat
        socket={socket}
        roomId={roomId}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
};

export default MeetingRoom;
