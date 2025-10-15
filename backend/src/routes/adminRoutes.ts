const express = require("express");
const pool = require("../config/db");
const auth = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/requireAdmin");
const claimService = require("../services/claimService");

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

// GET /api/admin/claims-month?year=YYYY&month=MM - list claims across users for a month
router.get("/claims-month", auth, requireAdmin, async (req: any, res: any) => {
  try {
    const year = parseInt((req.query.year as string) || new Date().getFullYear().toString(), 10);
    const month = parseInt((req.query.month as string) || (new Date().getMonth() + 1).toString(), 10);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: "Invalid year or month" });
    }

    // If credits_claims table doesn't exist, return empty
    const existsRes = await pool.query(`SELECT to_regclass($1) AS oid`, ['public.credits_claims']);
    const exists = Boolean(existsRes.rows?.[0]?.oid);
    if (!exists) return res.json({ year, month, claims: [] });

    const { rows } = await pool.query(
      `SELECT c.id, c.user_id, u.email, c.amount, c.note, c.claimed_at
       FROM credits_claims c
       JOIN users u ON u.id = c.user_id
       WHERE date_part('year', c.claimed_at) = $1
         AND date_part('month', c.claimed_at) = $2
       ORDER BY c.claimed_at DESC`,
      [year, month]
    );

    const claims = rows.map((r: any) => ({
      id: Number(r.id),
      userId: Number(r.user_id),
      email: r.email || null,
      amount: Number(r.amount || 0),
      note: r.note || null,
      claimedAt: r.claimed_at ? new Date(r.claimed_at).toISOString() : null,
    }));

    res.json({ year, month, claims });
  } catch (e: any) {
    res.status(500).json({ message: "Server error", error: e.message });
  }
});

// DELETE /api/admin/users/:id - delete a non-admin user and related records
router.delete("/users/:id", auth, requireAdmin, async (req: any, res: any) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const check = await pool.query(`SELECT role FROM users WHERE id = $1`, [userId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    if (check.rows[0]?.role === 'admin') {
      return res.status(400).json({ message: "Cannot delete admin user" });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const relatedTables = [
        'attendance',
        'claims',
        'credit_events',
        'credits_claims',
        'redeem_requests',
      ];

      for (const table of relatedTables) {
        // Only attempt delete if table exists in the current schema
        const existsRes = await client.query(`SELECT to_regclass($1) AS oid`, [`public.${table}`]);
        const exists = Boolean(existsRes.rows?.[0]?.oid);
        if (exists) {
          await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
        }
      }

      await client.query(`DELETE FROM users WHERE id = $1`, [userId]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.json({ message: "User deleted" });
  } catch (e: any) {
    res.status(500).json({ message: "Server error", error: e.message });
  }
});

// Admin: list all redeem requests
router.get("/redeem-requests", auth, requireAdmin, async (_req: any, res: any) => {
  try {
    const rows = await claimService.adminListAllRedeemRequests();
    res.json({ requests: rows });
  } catch (e: any) {
    res.status(500).json({ message: "Server error", error: e.message });
  }
});

// Admin: approve a redeem request (sets approved=true and credits user immediately)
router.post("/redeem-requests/:id/approve", auth, requireAdmin, async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: "Invalid id" });
    const reqRow = await claimService.getRedeemRequestById(id);
    if (!reqRow) return res.status(404).json({ message: "Request not found" });
    // Mark approved
    await claimService.adminApproveRedeemRequest(id);
    // Credit the user immediately and mark redeemed
    const { getAvailableCredits, redeemCredits } = claimService;
    const { available } = await getAvailableCredits(reqRow.user_id);
    if (Number(reqRow.amount) > available) return res.status(400).json({ message: "Insufficient available credits" });
    const result = await redeemCredits(reqRow.user_id, Number(reqRow.amount), reqRow.note);
    await claimService.markRequestRedeemed(id);
    try { require('../realtime').getIO()?.emit('claims:approved', { userId: reqRow.user_id, email: reqRow.email || null, requestId: id, amount: Number(reqRow.amount), at: new Date().toISOString() }); } catch {}
    res.json({ message: "Approved and credited", result });
  } catch (e: any) {
    res.status(500).json({ message: "Server error", error: e.message });
  }
});

// Admin: deny a redeem request (delete it)
router.post("/redeem-requests/:id/deny", auth, requireAdmin, async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: "Invalid id" });
    const exists = await claimService.getRedeemRequestById(id);
    if (!exists) return res.status(404).json({ message: "Request not found" });
    await claimService.adminDenyRedeemRequest(id);
    res.json({ message: "Denied" });
  } catch (e: any) {
    res.status(500).json({ message: "Server error", error: e.message });
  }
});


