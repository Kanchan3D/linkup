import { useEffect, useRef, useState, useCallback } from 'react';

const useWebRTC = (socket, roomId, localStream) => {
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const peersRef = useRef(new Map());
  
  // Debug hook initialization
  const hookId = useRef(Math.random().toString(36).substr(2, 9));
  console.log(`useWebRTC hook initialized with ID: ${hookId.current}`);

  const createPeerConnection = useCallback((socketId, isInitiator = false) => {
    console.log(`Creating peer connection for ${socketId}, isInitiator: ${isInitiator}`);
    
    // Check if peer connection already exists
    if (peersRef.current.has(socketId)) {
      console.log(`Peer connection already exists for ${socketId}, skipping creation`);
      return peersRef.current.get(socketId);
    }
    
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add local stream to peer connection
    if (localStream) {
      console.log(`Adding local stream tracks for ${socketId}:`, localStream.getTracks().length, 'tracks');
      localStream.getTracks().forEach(track => {
        console.log(`Adding track: ${track.kind} (${track.label})`);
        peerConnection.addTrack(track, localStream);
      });
    } else {
      console.warn(`No local stream available for ${socketId}`);
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log(`Received remote stream from ${socketId}:`, event.streams.length, 'streams');
      const [remoteStream] = event.streams;
      console.log(`Remote stream tracks:`, remoteStream.getTracks().map(t => `${t.kind} (${t.label})`));
      setRemoteStreams(prev => new Map(prev.set(socketId, remoteStream)));
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log(`Sending ICE candidate to ${socketId}:`, event.candidate);
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          to: socketId,
          from: socket.id
        });
      } else if (!event.candidate) {
        console.log(`ICE gathering complete for ${socketId}`);
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Peer connection state (${socketId}):`, peerConnection.connectionState);
      if (peerConnection.connectionState === 'failed') {
        console.error('Peer connection failed for:', socketId);
        removePeer(socketId);
      }
    };

    // Monitor ICE connection state
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state (${socketId}):`, peerConnection.iceConnectionState);
      
      if (peerConnection.iceConnectionState === 'failed' || 
          peerConnection.iceConnectionState === 'disconnected') {
        console.warn(`ICE connection issues for ${socketId}:`, peerConnection.iceConnectionState);
        
        // Try to restart ICE
        if (peerConnection.iceConnectionState === 'failed') {
          console.log(`Attempting ICE restart for ${socketId}`);
          peerConnection.restartIce();
        }
      }
      
      if (peerConnection.iceConnectionState === 'connected' || 
          peerConnection.iceConnectionState === 'completed') {
        console.log(`ICE connection established for ${socketId}`);
      }
    };

    peersRef.current.set(socketId, peerConnection);

    if (isInitiator) {
      createOffer(socketId, peerConnection);
    }

    return peerConnection;
  }, [localStream, socket]);

  const createOffer = useCallback(async (socketId, peerConnection) => {
    try {
      console.log(`Creating offer for ${socketId}`);
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await peerConnection.setLocalDescription(offer);
      console.log(`Local description set for ${socketId}:`, offer);
      
      if (socket) {
        socket.emit('offer', {
          offer,
          to: socketId,
          from: socket.id
        });
        console.log(`Offer sent to ${socketId}`);
      }
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }, [socket]);

  const createAnswer = useCallback(async (socketId, offer) => {
    try {
      console.log(`Creating answer for ${socketId}`);
      const peerConnection = peersRef.current.get(socketId) || createPeerConnection(socketId);
      
      console.log(`Setting remote description for ${socketId}:`, offer);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      console.log(`Local description set for ${socketId}:`, answer);
      
      if (socket) {
        socket.emit('answer', {
          answer,
          to: socketId,
          from: socket.id
        });
        console.log(`Answer sent to ${socketId}`);
      }
    } catch (error) {
      console.error('Error creating answer:', error);
    }
  }, [createPeerConnection, socket]);

  const handleAnswer = useCallback(async (socketId, answer) => {
    try {
      const peerConnection = peersRef.current.get(socketId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }, []);

  const handleIceCandidate = useCallback(async (socketId, candidate) => {
    try {
      const peerConnection = peersRef.current.get(socketId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }, []);

  const removePeer = useCallback((socketId) => {
    const peerConnection = peersRef.current.get(socketId);
    if (peerConnection) {
      peerConnection.close();
      peersRef.current.delete(socketId);
    }
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(socketId);
      return newMap;
    });
  }, []);

  useEffect(() => {
    if (!socket || !roomId) return;

    // Request existing users when component mounts
    socket.emit('request-users', { roomId });

    // Handle existing users
    const handleExistingUsers = (users) => {
      console.log('Received existing users:', users);
      users.forEach(({ socketId }) => {
        console.log('Creating peer connection for existing user:', socketId);
        createPeerConnection(socketId, true);
      });
    };

    // Handle user leaving
    const handleUserLeft = () => {
      console.log('User left, cleaning up connections');
      // Clean up all peer connections when user leaves
      // In a real app, you'd want to track which specific user left
      const currentPeers = new Map(peersRef.current);
      currentPeers.forEach((_, socketId) => {
        removePeer(socketId);
      });
    };

    // Handle WebRTC signaling
    const handleOffer = ({ offer, from }) => {
      console.log('Received offer from:', from, 'Offer:', offer);
      if (!offer || !from) {
        console.error('Invalid offer received:', { offer, from });
        return;
      }
      createAnswer(from, offer);
    };

    const handleAnswerReceived = ({ answer, from }) => {
      console.log('Received answer from:', from, 'Answer:', answer);
      if (!answer || !from) {
        console.error('Invalid answer received:', { answer, from });
        return;
      }
      handleAnswer(from, answer);
    };

    const handleIceCandidateReceived = ({ candidate, from }) => {
      console.log('Received ICE candidate from:', from, 'Candidate:', candidate);
      if (!candidate || !from) {
        console.error('Invalid ICE candidate received:', { candidate, from });
        return;
      }
      handleIceCandidate(from, candidate);
    };

    const handleWebRTCError = ({ error }) => {
      console.error('WebRTC Error:', error);
    };

    // Set up event listeners
    socket.on('existing-users', handleExistingUsers);
    socket.on('userLeft', handleUserLeft);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswerReceived);
    socket.on('ice-candidate', handleIceCandidateReceived);
    socket.on('webrtcError', handleWebRTCError);

    return () => {
      socket.off('existing-users', handleExistingUsers);
      socket.off('userLeft', handleUserLeft);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswerReceived);
      socket.off('ice-candidate', handleIceCandidateReceived);
      socket.off('webrtcError', handleWebRTCError);
      
      // Close all peer connections
      const currentPeers = peersRef.current;
      currentPeers.forEach((peerConnection) => {
        peerConnection.close();
      });
      peersRef.current.clear();
      setRemoteStreams(new Map());
    };
  }, [socket, roomId, createPeerConnection, createAnswer, handleAnswer, handleIceCandidate, removePeer]);

  // Update peer connections when local stream changes
  useEffect(() => {
    if (localStream) {
      peersRef.current.forEach((peerConnection) => {
        // Remove existing tracks
        peerConnection.getSenders().forEach(sender => {
          peerConnection.removeTrack(sender);
        });
        
        // Add new tracks
        localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
        });
      });
    }
  }, [localStream]);

  return { remoteStreams, removePeer };
};

export default useWebRTC;
