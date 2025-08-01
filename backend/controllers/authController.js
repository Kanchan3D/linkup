const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide name, email, and password" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({ 
      name, 
      email: email.toLowerCase(), 
      password: hashedPassword 
    });

    // Generate token
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: "7d" }
    );

    return res.status(201).json({ 
      message: "User registered successfully",
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email 
      }
    });
  } catch (err) {
    console.error("Registration error details:", {
      message: err.message,
      stack: err.stack,
      name: err.name,
      code: err.code
    });
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: errors.join(', ') });
    }
    if (err.code === 11000) {
      return res.status(400).json({ message: "User with this email already exists" });
    }
    
    // Check for JWT secret error
    if (err.message && err.message.includes('secretOrPrivateKey')) {
      console.error("JWT_SECRET is missing or invalid");
      return res.status(500).json({ message: "Server configuration error" });
    }
    
    return res.status(500).json({ 
      message: "Server error during registration",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email 
      }
    });
  } catch (err) {
    console.error("Login error details:", {
      message: err.message,
      stack: err.stack,
      name: err.name,
      email: req.body?.email,
      hasJWTSecret: !!process.env.JWT_SECRET,
      hasMongoURI: !!(process.env.MONGODB_URI || process.env.MONGO_URI)
    });
    
    // Check for specific errors
    if (err.message && err.message.includes('secretOrPrivateKey')) {
      console.error("JWT_SECRET is missing or invalid during login");
      return res.status(500).json({ 
        message: "Server configuration error",
        details: "JWT secret missing"
      });
    }
    
    if (err.name === 'MongooseError' || err.name === 'MongoError' || err.name === 'MongoServerError') {
      console.error("Database error during login:", err.message);
      return res.status(500).json({ 
        message: "Database connection error",
        details: err.message
      });
    }
    
    return res.status(500).json({ 
      message: "Server error during login",
      details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
};
