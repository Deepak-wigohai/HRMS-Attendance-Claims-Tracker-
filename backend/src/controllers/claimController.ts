import type { Request, Response } from "express";
const claimService = require("../services/claimService");
const { sendMail } = require("../services/mailer");

const today = (req: Request, res: Response) => {
  try {
    // @ts-ignore added by auth middleware
    const userId = req.user.id as number;
    // @ts-ignore
    const role = (req.user && (req.user as any).role) || 'user';
    if (role === 'admin') {
      return res.json({
        date: new Date().toISOString().slice(0,10),
        firstLogin: null,
        lastLogout: null,
        morningEligible: false,
        eveningEligible: false,
        morningCredit: 0,
        eveningCredit: 0,
        totalCredit: 0,
      });
    }
    claimService
      .computeTodayClaim(userId)
      .then((result: any) => res.json(result))
      .catch((err: any) => res.status(500).json({ message: "Server error", error: err.message }));
  } catch (err: any) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const month = (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user.id as number;
    const year = parseInt((req.query.year as string) || new Date().getFullYear().toString(), 10);
    const month = parseInt((req.query.month as string) || (new Date().getMonth() + 1).toString(), 10);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: "Invalid year or month" });
    }
    // @ts-ignore
    const role = (req.user && (req.user as any).role) || 'user';
    if (role === 'admin') {
      return res.json({ year, month, count: 0, totalClaimed: 0, claims: [] });
    }
    claimService
      .computeMonthClaim(userId, year, month)
      .then((result: any) => res.json(result))
      .catch((err: any) => res.status(500).json({ message: "Server error", error: err.message }));
  } catch (err: any) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const monthSummary = (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user.id as number;
    const year = parseInt((req.query.year as string) || new Date().getFullYear().toString(), 10);
    const month = parseInt((req.query.month as string) || (new Date().getMonth() + 1).toString(), 10);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: "Invalid year or month" });
    }
    // @ts-ignore
    const role = (req.user && (req.user as any).role) || 'user';
    if (role === 'admin') {
      return res.json({ year, month, earnedInMonth: 0, claimedInMonth: 0, remaining: 0 });
    }
    claimService
      .getMonthSummary(userId, year, month)
      .then((result: any) => res.json(result))
      .catch((err: any) => res.status(500).json({ message: "Server error", error: err.message }));
  } catch (err: any) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const monthEarned = (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user.id as number;
    const year = parseInt((req.query.year as string) || new Date().getFullYear().toString(), 10);
    const month = parseInt((req.query.month as string) || (new Date().getMonth() + 1).toString(), 10);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: "Invalid year or month" });
    }
    // @ts-ignore
    const role = (req.user && (req.user as any).role) || 'user';
    if (role === 'admin') {
      return res.json({ year, month, days: [] });
    }
    claimService
      .getMonthEarnings(userId, year, month)
      .then((result: any) => res.json({ year, month, days: result }))
      .catch((err: any) => res.status(500).json({ message: "Server error", error: err.message }));
  } catch (err: any) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// removed unused submit handler

const available = (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user.id as number;
    // @ts-ignore
    const role = (req.user && (req.user as any).role) || 'user';
    if (role === 'admin') {
      return res.json({ available: 0, earned: 0, claimed: 0 });
    }
    claimService
      .getAvailableCredits(userId)
      .then((data: any) => res.json(data))
      .catch((err: any) => res.status(500).json({ message: "Server error", error: err.message }));
  } catch (err: any) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const redeem = (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const user = req.user as any;
    const userId = user.id as number;
    const role = (user && user.role) || 'user';
    if (role === 'admin') {
      return res.status(403).json({ message: 'Admins cannot redeem credits' });
    }
    const { requestId } = req.body || {};
    const id = parseInt(requestId, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: 'requestId is required' });
    }
    claimService
      .getRedeemRequestById(id)
      .then(async (reqRow: any) => {
        if (!reqRow || reqRow.user_id !== userId) throw new Error('Invalid request');
        if (reqRow.redeemed) throw new Error('Request already redeemed');
        if (!reqRow.approved) throw new Error('Request not approved by admin');
        const { available } = await claimService.getAvailableCredits(userId);
        if (reqRow.amount > available) throw new Error('Insufficient available credits');
        const data = await claimService.redeemCredits(userId, reqRow.amount, reqRow.note);
        await claimService.markRequestRedeemed(reqRow.id);
        try { require('../realtime').getIO()?.emit('claims:redeemed', { userId, email: user.email || null, requestId: reqRow.id, amount: reqRow.amount, at: new Date().toISOString() }); } catch {}
        return res.status(201).json(data);
      })
      .catch((err: any) => res.status(400).json({ message: err.message }));
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// POST /claims/request-redeem
const requestRedeem = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const user = req.user as any;
    if (user?.role === 'admin') return res.status(403).json({ message: 'Admins cannot request redeem' });
    const { amount, note, adminEmail } = req.body || {};
    const row = await claimService.createRedeemRequest(user.id, Number(amount), note, adminEmail);

    try {
      await sendMail({
        to: row.admin_email,
        subject: `Redeem request #${row.id} from ${user.email}`,
        text: `User ${user.email} requested to redeem ₹${row.amount}. Note: ${row.note || '-'} (Request ID: ${row.id})`,
        html: `<p>User <b>${user.email}</b> requested to redeem <b>₹${row.amount}</b>.</p><p>Note: ${row.note || '-'}</p><p>Request ID: <b>${row.id}</b></p>`,
        replyTo: user.email,
      });
    } catch (e: any) {
      console.error('Mail send failed:', e?.message || e);
    }

    res.status(201).json({ message: 'Redeem request created', request: row });
    try { require('../realtime').getIO()?.emit('claims:request', { userId: user.id, email: user.email, requestId: row.id, amount: row.amount, at: row.created_at }); } catch {}
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// GET /claims/redeem-requests
const listRedeemRequests = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const user = req.user as any;
    const rows = await claimService.listRedeemRequests(user.id);
    res.json({ requests: rows });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { today, month, monthSummary, monthEarned, available, redeem, requestRedeem, listRedeemRequests };


