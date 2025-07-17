import { useState } from "react";

const ChatBox = ({ messages = [], onSend }) => {
  const [msg, setMsg] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (msg.trim()) {
      onSend(msg);
      setMsg("");
    }
  };

  return (
    <div className="w-full max-w-sm h-full bg-white rounded-xl shadow flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m, i) => (
          <div key={i} className="bg-gray-200 rounded p-2 text-sm">
            <strong>{m.user}: </strong>{m.text}
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-2 border-t flex gap-2 items-center"
      >
        <input
          type="text"
          className="flex-1 px-3 py-2 border rounded"
          placeholder="Type a message..."
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
