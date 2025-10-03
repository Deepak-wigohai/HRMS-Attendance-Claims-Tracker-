import { Request, Response } from "express";
import { calculateMonthlyCredits, submitClaim } from "../services/claimService";

export const getMonthlyClaims = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { month } = req.query; // e.g. ?month=2025-10

    if (!month) {
      return res.status(400).json({ error: "Month is required (YYYY-MM)" });
    }

    const { days, total } = await calculateMonthlyCredits(userId, String(month));
    res.json({ month, total, days });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const submitMonthlyClaim = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { month } = req.body;

    if (!month) {
      return res.status(400).json({ error: "Month is required (YYYY-MM)" });
    }

    // Recalculate credits to prevent tampering
    const { total } = await calculateMonthlyCredits(userId, month);

    const claim = await submitClaim(userId, month, total);

    res.status(201).json({ message: "Claim submitted", claim });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
