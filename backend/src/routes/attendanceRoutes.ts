const express = require("express");
const { login, logout, today } = require("../controllers/attendanceController");
const authMiddleware = require("../middlewares/authMiddleware");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { createClient } = require("redis");

const router = express.Router();


const redisUrl = process.env.REDIS_URL;
const redisClient = redisUrl ? createClient({ url: redisUrl }) : null;
if (redisClient) {
  redisClient.on('error', (err: any) => console.error('Redis error:', err));
  redisClient.connect().catch((e: any) => console.error('Redis connect error:', e));
}


// Helper to bucket requests into daily windows starting at EVENING_CUTOFF local time
function bucketLabelFor19hWindow(now: Date) {
  const { EVENING_CUTOFF_HOUR, EVENING_CUTOFF_MINUTE } = require("../config/timings");
  const anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), EVENING_CUTOFF_HOUR, EVENING_CUTOFF_MINUTE, 0, 0);
  const bucketStart = (now >= anchor) ? anchor : new Date(anchor.getTime() - 24 * 60 * 60 * 1000);
  const y = bucketStart.getFullYear();
  const m = String(bucketStart.getMonth() + 1).padStart(2, '0');
  const d = String(bucketStart.getDate()).padStart(2, '0');
  const hh = String(EVENING_CUTOFF_HOUR).padStart(2, '0');
  const mm = String(EVENING_CUTOFF_MINUTE).padStart(2, '0');
  return `${y}${m}${d}-${hh}${mm}`;
}

const punchInRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 5,
  keyGenerator: (req: any) => {
    const userId = (req.user && req.user.id);
    const bucket = bucketLabelFor19hWindow(new Date());
    return `${String(userId)}:${bucket}`;
  },
  message: { message: "Punch-in limit reached. Try again tomorrow." },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient ? new RedisStore({
    sendCommand: (...args: any[]) => (redisClient as any).sendCommand(args),
  }) : undefined,
});

router.post("/login", authMiddleware, punchInRateLimit, login);
router.post("/logout", authMiddleware, logout);
router.get("/today", authMiddleware, today);

module.exports = router;
