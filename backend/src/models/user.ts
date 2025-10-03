import pool from "../config/db";

export interface User {
  id?: number;
  name: string;
  email: string;
  password: string; // hashed password
}

export const createUser = async (user: User): Promise<User> => {
  const { name, email, password } = user;
  const result = await pool.query(
    "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
    [name, email, password]
  );
  return result.rows[0];
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows.length ? result.rows[0] : null;
};
