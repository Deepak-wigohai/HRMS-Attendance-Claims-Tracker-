import { Router } from "express";
import { getMonthlyClaims, submitMonthlyClaim } from "../controllers/claimController";
import authMiddleware from "../middlewares/authMiddleware";

const router = Router();

router.get("/claims/month", authMiddleware, getMonthlyClaims);
router.post("/claims/submit", authMiddleware, submitMonthlyClaim);

export default router;
