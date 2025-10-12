const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
const apiRoutes = express.Router();

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
const adminRoutes = require("./routes/adminRoutes");


apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/attendance", attendanceRoutes);
apiRoutes.use("/claims", claimRoutes);
apiRoutes.use("/user", userRoutes);
apiRoutes.use("/admin", adminRoutes);

app.use("/api", apiRoutes);


app.get("/", (_: Request, res: Response) => {
  res.send("Server is running...");
});

module.exports = app;
