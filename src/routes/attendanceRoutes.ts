import { Router } from "express";
import { login, logout, today } from "../controllers/attendanceController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post("/login", authMiddleware, login);
router.post("/logout", authMiddleware, logout);
router.get("/today", authMiddleware, today);

export default router;
