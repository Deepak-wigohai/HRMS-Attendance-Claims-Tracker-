const express = require("express");
const { login, logout, today } = require("../controllers/attendanceController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/login", authMiddleware, login);
router.post("/logout", authMiddleware, logout);
router.get("/today", authMiddleware, today);

module.exports = router;
