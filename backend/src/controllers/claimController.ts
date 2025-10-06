import type { Request, Response } from "express";
const claimService = require("../services/claimService");

const today = async (req: Request, res: Response) => {
  try {
    // @ts-ignore added by auth middleware
    const userId = req.user.id as number;
    const result = await claimService.computeTodayClaim(userId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const month = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user.id as number;
    const year = parseInt((req.query.year as string) || new Date().getFullYear().toString(), 10);
    const month = parseInt((req.query.month as string) || (new Date().getMonth() + 1).toString(), 10);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: "Invalid year or month" });
    }
    const result = await claimService.computeMonthClaim(userId, year, month);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const submit = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user.id as number;
    const { year, month } = req.body || {};
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
      return res.status(400).json({ message: "Invalid year or month" });
    }
    const saved = await claimService.submitMonthClaim(userId, y, m);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const available = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user.id as number;
    const data = await claimService.getAvailableCredits(userId);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const redeem = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user.id as number;
    const { amount, note } = req.body || {};
    const amt = parseInt(amount, 10);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    const data = await claimService.redeemCredits(userId, amt, note);
    res.status(201).json(data);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = { today, month, submit, available, redeem };


