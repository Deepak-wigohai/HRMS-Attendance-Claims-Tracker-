import pool from "../config/db";

export const logLogin = async (userId: number) => {
  const result = await pool.query(
    `INSERT INTO attendance (user_id, login_time) 
     VALUES ($1, NOW()) RETURNING *`,
    [userId]
  );
  return result.rows[0];
};

export const logLogout = async (userId: number) => {
  const result = await pool.query(
    `UPDATE attendance 
     SET logout_time = NOW() 
     WHERE user_id = $1 
       AND created_at = CURRENT_DATE 
       AND logout_time IS NULL
     RETURNING *`,
    [userId]
  );
  return result.rows[0];
};

export const getTodayAttendance = async (userId: number) => {
  const result = await pool.query(
    `SELECT * FROM attendance 
     WHERE user_id = $1 
       AND created_at = CURRENT_DATE`,
    [userId]
  );
  return result.rows;
};
