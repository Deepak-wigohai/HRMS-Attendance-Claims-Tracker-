const express = require("express");
const { today, month, submit } = require("../controllers/claimController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/today", authMiddleware, today);
router.get("/month", authMiddleware, month);
router.post("/submit", authMiddleware, submit);

module.exports = router;


