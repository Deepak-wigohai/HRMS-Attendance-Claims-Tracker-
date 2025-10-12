import type { Request, Response } from "express";
const claimService = require("../services/claimService");

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
    const userId = req.user.id as number;
    // @ts-ignore
    const role = (req.user && (req.user as any).role) || 'user';
    if (role === 'admin') {
      return res.status(403).json({ message: 'Admins cannot redeem credits' });
    }
    const { amount, note } = req.body || {};
    const amt = parseInt(amount, 10);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    claimService
      .redeemCredits(userId, amt, note)
      .then((data: any) => res.status(201).json(data))
      .catch((err: any) => res.status(400).json({ message: err.message }));
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = { today, month, monthSummary, monthEarned, available, redeem };


