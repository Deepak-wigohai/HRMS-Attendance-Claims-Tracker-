const express = require("express");
const pool = require("../config/db");
const auth = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/requireAdmin");

const router = express.Router();

// GET /api/admin/overview
router.get("/overview", auth, requireAdmin, async (_req: any, res: any) => {
  try {
    const [usersRes, adminsRes, presentRes] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS c FROM users`),
      pool.query(`SELECT COUNT(*)::int AS c FROM users WHERE role = 'admin'`),
      pool.query(
        `SELECT COUNT(DISTINCT user_id)::int AS c
         FROM attendance
         WHERE DATE(login_time) = CURRENT_DATE
           AND (logout_time IS NULL OR DATE(logout_time) = CURRENT_DATE)`
      ),
    ]);

    res.json({
      totalUsers: usersRes.rows[0].c,
      totalAdmins: adminsRes.rows[0].c,
      presentToday: presentRes.rows[0].c,
    });
  } catch (e: any) {
    res.status(500).json({ message: "Server error", error: e.message });
  }
});

module.exports = router;


