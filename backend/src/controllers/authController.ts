const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
import type { Request, Response } from "express";

// POST /auth/signup
const signup = (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    pool
      .query("SELECT * FROM users WHERE email = $1", [email])
      .then((userCheck: any) => {
        if (userCheck.rows.length > 0) {
          return res.status(400).json({ message: "User already exists" });
        }
        const saltRounds = 10;
        return bcrypt.hash(password, saltRounds).then((hashedPassword: string) =>
          pool
            .query(
              "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
              [email, hashedPassword]
            )
            .then((newUser: any) => res.status(201).json({ message: "User registered", user: newUser.rows[0] }))
        );
      })
      .catch((error: any) => res.status(500).json({ message: "Server error", error: error.message }));
  } catch (error: any) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST /auth/login
const login = (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Check user
    pool
      .query("SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL", [email])
      .then((userCheck: any) => {
        if (userCheck.rows.length === 0) {
          return res.status(400).json({ message: "Invalid credentials" });
        }

        const user = userCheck.rows[0];
        return bcrypt.compare(password, user.password).then((validPassword: boolean) => {
          if (!validPassword) {
            return res.status(400).json({ message: "Invalid credentials" });
          }
          const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role || 'user' },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
          );
          return res.json({ message: "Login successful", token, role: user.role || 'user' });
        });
      })
      .catch((error: any) => res.status(500).json({ message: "Server error", error: error.message }));
  } catch (error: any) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { signup, login };
