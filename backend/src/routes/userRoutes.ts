const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const { getUserIncentivesById } = require("../models/userModel");

const router = express.Router();

// GET /user/incentives - Get user's incentive rates
router.get("/incentives", authMiddleware, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const incentives = await getUserIncentivesById(userId);
    
    if (!incentives) {
      return res.status(404).json({ message: "User incentives not found" });
    }
    
    res.json(incentives);
  } catch (err: any) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
