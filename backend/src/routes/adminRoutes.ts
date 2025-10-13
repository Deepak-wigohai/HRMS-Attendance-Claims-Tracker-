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

// GET /api/admin/activity - last 24 hours attendance events
router.get("/activity", auth, requireAdmin, async (_req: any, res: any) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.user_id, u.email, a.login_time, a.logout_time
       FROM attendance a
       JOIN users u ON u.id = a.user_id
       WHERE a.login_time >= NOW() - INTERVAL '24 hours'
          OR (a.logout_time IS NOT NULL AND a.logout_time >= NOW() - INTERVAL '24 hours')`
    );
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const events: Array<{ type: string; userId: number; email: string | null; at: string }> = [];
    for (const r of rows) {
      const uid = Number(r.user_id);
      const email = r.email || null;
      if (r.login_time) {
        const t = new Date(r.login_time).toISOString();
        if (new Date(t).getTime() >= since) events.push({ type: 'login', userId: uid, email, at: t });
      }
      if (r.logout_time) {
        const t2 = new Date(r.logout_time).toISOString();
        if (new Date(t2).getTime() >= since) events.push({ type: 'logout', userId: uid, email, at: t2 });
      }
    }
    events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    res.json({ events });
  } catch (e: any) {
    res.status(500).json({ message: "Server error", error: e.message });
  }
});

// GET /api/admin/users-min - id and email list for mapping
router.get("/users-min", auth, requireAdmin, async (_req: any, res: any) => {
  try {
    const { rows } = await pool.query(`SELECT id, email, role FROM users`);
    res.json({ users: rows.map((r: any) => ({ id: Number(r.id), email: r.email, role: r.role })) });
  } catch (e: any) {
    res.status(500).json({ message: "Server error", error: e.message });
  }
});


