const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");

import type { Request, Response } from "express";

dotenv.config();

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

// Routes
const authRoutes = require("./routes/authRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const claimRoutes = require("./routes/claimRoutes");
const userRoutes = require("./routes/userRoutes");

app.use("/auth", authRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/claims", claimRoutes);
app.use("/user", userRoutes);

app.get("/", (_: Request, res: Response) => {
  res.send("🚀 Server is running...");
});

module.exports = app;
