import { Request, Response } from "express";
import * as attendanceService from "../services/attendanceService";

export const login = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user; // from authMiddleware
    const record = await attendanceService.loginAttendance(user.id);
    res.status(201).json(record);
  } catch (err) {
    console.error("Attendance login error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const record = await attendanceService.logoutAttendance(user.id);
    res.status(200).json(record);
  } catch (err) {
    console.error("Attendance logout error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const today = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const records = await attendanceService.todayAttendance(user.id);
    res.status(200).json(records);
  } catch (err) {
    console.error("Attendance fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
