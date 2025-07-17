import { useEffect, useRef, useState } from 'react';

const useWebRTC = (socket, roomId, localStream) => {
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const peersRef = useRef(new Map());

  const createPeerConnection = (socketId, isInitiator = false) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add local stream to peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => new Map(prev.set(socketId, remoteStream)));
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          to: socketId,
          from: socket.id
        });
      }
    };

    peersRef.current.set(socketId, peerConnection);

    if (isInitiator) {
      createOffer(socketId, peerConnection);
    }

    return peerConnection;
  };

  const createOffer = async (socketId, peerConnection) => {
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('offer', {
        offer,
        to: socketId,
        from: socket.id
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  const createAnswer = async (socketId, offer) => {
    try {
      const peerConnection = peersRef.current.get(socketId) || createPeerConnection(socketId);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      socket.emit('answer', {
        answer,
        to: socketId,
        from: socket.id
      });
    } catch (error) {
      console.error('Error creating answer:', error);
    }
  };

  const handleAnswer = async (socketId, answer) => {
    try {
      const peerConnection = peersRef.current.get(socketId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleIceCandidate = async (socketId, candidate) => {
    try {
      const peerConnection = peersRef.current.get(socketId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  };

  const removePeer = (socketId) => {
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
  };

  useEffect(() => {
    if (!socket || !roomId) return;

    // Request existing users when component mounts
    socket.emit('request-users', { roomId });

    // Handle existing users
    socket.on('existing-users', (users) => {
      users.forEach(({ socketId }) => {
        createPeerConnection(socketId, true);
      });
    });

    // Handle new user joining
    socket.on('userJoined', (userData) => {
      // This will be handled by the offer from the new user
    });

    // Handle user leaving
    socket.on('userLeft', (userData) => {
      // Find the socket ID associated with this user and remove peer
      // This is a simplified approach - in production you'd want better tracking
      peersRef.current.forEach((_, socketId) => {
        removePeer(socketId);
      });
    });

    // Handle WebRTC signaling
    socket.on('offer', ({ offer, from }) => {
      createAnswer(from, offer);
    });

    socket.on('answer', ({ answer, from }) => {
      handleAnswer(from, answer);
    });

    socket.on('ice-candidate', ({ candidate, from }) => {
      handleIceCandidate(from, candidate);
    });

    return () => {
      socket.off('existing-users');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      
      // Close all peer connections
      peersRef.current.forEach((peerConnection) => {
        peerConnection.close();
      });
      peersRef.current.clear();
      setRemoteStreams(new Map());
    };
  }, [socket, roomId, localStream]);

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
