import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

const Dashboard = () => {
  const [roomCode, setRoomCode] = useState("");
  const navigate = useNavigate();

  const handleCreateMeeting = () => {
    const newRoomId = uuidv4();
    navigate(`/meeting/${newRoomId}`);
  };

  const handleJoinMeeting = () => {
    if (!roomCode.trim()) return alert("Please enter a room code.");
    navigate(`/meeting/${roomCode}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-6 space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-800">
          Dashboard
        </h1>

        <div className="flex flex-col gap-4">
          <button
            onClick={handleCreateMeeting}
            className="bg-blue-600 text-white py-2 px-4 rounded-xl hover:bg-blue-700 transition"
          >
            📞 Create New Meeting
          </button>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter Room Code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none"
            />
            <button
              onClick={handleJoinMeeting}
              className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700"
            >
              Join
            </button>
          </div>
        </div>

        <div className="mt-6 border-t pt-4 text-gray-600">
          <p className="text-sm text-center">Upcoming Meetings (coming soon)</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
