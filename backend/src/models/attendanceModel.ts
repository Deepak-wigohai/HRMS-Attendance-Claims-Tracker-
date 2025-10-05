const pool = require("../config/db");

const createLogin = async (userId: number) => {
  const result = await pool.query(
    "INSERT INTO attendance (user_id, login_time) VALUES ($1, NOW()) RETURNING *",
    [userId]
  );
  return result.rows[0];
};

const setLogout = async (userId: number) => {
  const result = await pool.query(
    `UPDATE attendance 
     SET logout_time = NOW() 
     WHERE user_id = $1 AND logout_time IS NULL 
     RETURNING *`,
    [userId]
  );
  return result.rows[0];
};

const getTodayAttendance = async (userId: number) => {
  const result = await pool.query(
    `SELECT * FROM attendance 
     WHERE user_id = $1 AND DATE(login_time) = CURRENT_DATE`,
    [userId]
  );
  return result.rows;
};

const getTodayDayBounds = async (userId: number) => {
  // First login today (min login_time), Last logout today (max logout_time)
  const firstLoginResult = await pool.query(
    `SELECT MIN(login_time) AS first_login
     FROM attendance
     WHERE user_id = $1 AND DATE(login_time) = CURRENT_DATE`,
    [userId]
  );

  const lastLogoutResult = await pool.query(
    `SELECT MAX(logout_time) AS last_logout
     FROM attendance
     WHERE user_id = $1 AND logout_time IS NOT NULL AND DATE(logout_time) = CURRENT_DATE`,
    [userId]
  );

  return {
    first_login: firstLoginResult.rows[0]?.first_login || null,
    last_logout: lastLogoutResult.rows[0]?.last_logout || null,
  } as { first_login: Date | null; last_logout: Date | null };
};

const getDayBoundsForDate = async (userId: number, isoDate: string) => {
  // isoDate expected format: YYYY-MM-DD (local date to compare by DATE())
  const firstLoginResult = await pool.query(
    `SELECT MIN(login_time) AS first_login
     FROM attendance
     WHERE user_id = $1 AND DATE(login_time) = $2`,
    [userId, isoDate]
  );

  const lastLogoutResult = await pool.query(
    `SELECT MAX(logout_time) AS last_logout
     FROM attendance
     WHERE user_id = $1 AND logout_time IS NOT NULL AND DATE(logout_time) = $2`,
    [userId, isoDate]
  );

  return {
    first_login: firstLoginResult.rows[0]?.first_login || null,
    last_logout: lastLogoutResult.rows[0]?.last_logout || null,
  } as { first_login: Date | null; last_logout: Date | null };
};

module.exports = { createLogin, setLogout, getTodayAttendance, getTodayDayBounds, getDayBoundsForDate };
