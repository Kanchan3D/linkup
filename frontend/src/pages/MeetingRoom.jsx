import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

const MeetingRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const userVideoRef = useRef(null);

  useEffect(() => {
    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing media devices.", err);
        alert("Could not access camera/mic. Check permissions.");
      }
    };

    startVideo();
  }, []);

  const handleLeave = () => {
    // Later: disconnect socket & clean streams
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="flex justify-between items-center p-4 bg-gray-900">
        <h2 className="text-xl font-semibold">Meeting Room: {roomId}</h2>
        <button
          onClick={handleLeave}
          className="bg-red-600 px-4 py-2 rounded-xl hover:bg-red-700 transition"
        >
          Leave
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
          {/* Your Video */}
          <div className="bg-gray-800 p-4 rounded-xl text-center">
            <video
              ref={userVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 object-cover rounded-lg"
            />
            <p className="mt-2">You</p>
          </div>

          {/* Placeholder for other participants */}
          <div className="bg-gray-800 p-4 rounded-xl text-center flex items-center justify-center">
            <p className="text-gray-400">Other Participants (coming soon)</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MeetingRoom;
