const jwt = require("jsonwebtoken");
const pool = require("../config/db");
import type { Request, Response, NextFunction } from "express";

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access denied, no token provided" });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    // @ts-ignore
    req.user = verified;
    try {
      const id = Number((verified as any).id);
      if (Number.isFinite(id)) {
        const r = await pool.query(`SELECT deleted_at FROM users WHERE id = $1`, [id]);
        if (!r.rows.length || r.rows[0].deleted_at) {
          return res.status(401).json({ message: "User is deactivated" });
        }
      }
    } catch {}
    next();
  } catch (error) {
    return res.status(400).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware;
