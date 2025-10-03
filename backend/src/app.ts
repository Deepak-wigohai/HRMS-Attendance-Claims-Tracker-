import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/authRoutes";
import { authMiddleware } from "./middleware/authMiddleware";
import "./config/db";
import attendanceRoutes from "./routes/attendanceRoutes";

dotenv.config();
const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());

// Auth routes
app.use("/auth", authRoutes);

app.use("/attendance", attendanceRoutes);


// Example protected route
app.get("/protected", authMiddleware, (req, res) => {
  res.json({ message: "This is a protected route", user: (req as any).user });
});

export default app;
