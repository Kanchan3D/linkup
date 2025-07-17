const VideoPlayer = ({ stream, muted = false, label = "User" }) => {
  return (
    <div className="bg-gray-800 p-4 rounded-xl text-center">
      <video
        ref={(video) => {
          if (video && stream) video.srcObject = stream;
        }}
        autoPlay
        playsInline
        muted={muted}
        className="w-full h-64 object-cover rounded-lg"
      />
      <p className="mt-2 text-white">{label}</p>
    </div>
  );
};

export default VideoPlayer;
