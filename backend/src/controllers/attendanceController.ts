import type { Request, Response } from "express";
const attendanceService = require("../services/attendanceService");

const login = (req: Request, res: Response) => {
  try {
    // @ts-ignore: added in authMiddleware
    const userId = req.user.id;

    attendanceService
      .login(userId)
      .then((record: any) => res.status(201).json({ message: "Login recorded", record }))
      .catch((err: any) => res.status(500).json({ message: "Server error", error: err.message }));
  } catch (err: any) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const logout = (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user.id;

    attendanceService
      .logout(userId)
      .then((record: any) => {
        if (!record) {
          return res.status(400).json({ message: "No active login session" });
        }
        return res.json({ message: "Logout recorded", record });
      })
      .catch((err: any) => res.status(500).json({ message: "Server error", error: err.message }));
  } catch (err: any) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const today = (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user.id;

    attendanceService
      .today(userId)
      .then((records: any) => res.json({ records }))
      .catch((err: any) => res.status(500).json({ message: "Server error", error: err.message }));
  } catch (err: any) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { login, logout, today };
