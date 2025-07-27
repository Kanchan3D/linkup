const express = require("express");
const { register, login } = require("../controllers/authController");

const router = express.Router();

// Debug middleware
router.use((req, res, next) => {
  console.log(`Auth route accessed: ${req.method} ${req.path}`, {
    body: req.body,
    timestamp: new Date().toISOString()
  });
  next();
});

// Test route
router.get("/test", (req, res) => {
  res.json({ message: "Auth routes are working" });
});

router.post("/register", register);
router.post("/login", login);

module.exports = router;
