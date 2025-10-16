const express = require("express");
const { signup, login } = require("../controllers/authController");
const { rateLimit } = require("express-rate-limit");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/signup", signup);
router.post("/login", loginLimiter, login);

module.exports = router;
