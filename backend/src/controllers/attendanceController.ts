import type { Request, Response } from "express";
const attendanceService = require("../services/attendanceService");

const login = async (req: Request, res: Response) => {
  try {
    // @ts-ignore: added in authMiddleware
    const userId = req.user.id;

    const record = await attendanceService.login(userId);
    res.status(201).json({ message: "Login recorded", record });
  } catch (err: any) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const logout = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user.id;

    const record = await attendanceService.logout(userId);
    if (!record) {
      return res.status(400).json({ message: "No active login session" });
    }

    res.json({ message: "Logout recorded", record });
  } catch (err: any) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const today = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user.id;

    const records = await attendanceService.today(userId);
    res.json({ records });
  } catch (err: any) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { login, logout, today };
