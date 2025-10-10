const express = require("express");
const { today, month, monthSummary, monthEarned, available, redeem } = require("../controllers/claimController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/today", authMiddleware, today);
router.get("/month", authMiddleware, month);
router.get("/month-summary", authMiddleware, monthSummary);
router.get("/month-earned", authMiddleware, monthEarned);
router.get("/available", authMiddleware, available);
router.post("/redeem", authMiddleware, redeem);

module.exports = router;


