const mongoose = require("mongoose");

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log("MongoDB already connected");
    return;
  }

  try {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(process.env.MONGO_URI, opts);
    isConnected = true;
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    throw err; // Don't exit process in serverless environment
  }
};

module.exports = connectDB;
