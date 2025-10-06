const express = require("express");
const { today, month, available, redeem } = require("../controllers/claimController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/today", authMiddleware, today);
router.get("/month", authMiddleware, month);
router.get("/available", authMiddleware, available);
router.post("/redeem", authMiddleware, redeem);

module.exports = router;


