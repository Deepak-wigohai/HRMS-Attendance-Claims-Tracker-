const pool = require("../config/db");

const createLogin = (userId: number) => {
  return pool
    .query(
      "INSERT INTO attendance (user_id, login_time) VALUES ($1, NOW()) RETURNING *",
      [userId]
    )
    .then((result: any) => result.rows[0]);
};

const setLogout = (userId: number) => {
  return pool
    .query(
      `UPDATE attendance 
       SET logout_time = NOW() 
       WHERE user_id = $1 AND logout_time IS NULL 
       RETURNING *`,
      [userId]
    )
    .then((result: any) => result.rows[0]);
};

const getTodayAttendance = (userId: number) => {
  return pool
    .query(
      `SELECT * FROM attendance 
       WHERE user_id = $1 AND DATE(login_time) = CURRENT_DATE`,
      [userId]
    )
    .then((result: any) => result.rows);
};

const hasOpenLoginToday = (userId: number) => {
  return pool
    .query(
      `SELECT 1 FROM attendance 
       WHERE user_id = $1 AND DATE(login_time) = CURRENT_DATE AND logout_time IS NULL 
       LIMIT 1`,
      [userId]
    )
    .then((result: any) => result.rows.length > 0);
};

const getTodayDayBounds = (userId: number) => {
  // First login today (min login_time), Last logout today (max logout_time)
  return Promise.all([
    pool.query(
      `SELECT MIN(login_time) AS first_login
       FROM attendance
       WHERE user_id = $1 AND DATE(login_time) = CURRENT_DATE`,
      [userId]
    ),
    pool.query(
      `SELECT MAX(logout_time) AS last_logout
       FROM attendance
       WHERE user_id = $1 AND logout_time IS NOT NULL AND DATE(logout_time) = CURRENT_DATE`,
      [userId]
    ),
  ]).then(([firstLoginResult, lastLogoutResult]: any[]) => ({
    first_login: firstLoginResult.rows[0]?.first_login || null,
    last_logout: lastLogoutResult.rows[0]?.last_logout || null,
  }) as { first_login: Date | null; last_logout: Date | null });
};

const getDayBoundsForDate = (userId: number, isoDate: string) => {
  // isoDate expected format: YYYY-MM-DD (local date to compare by DATE())
  return Promise.all([
    pool.query(
      `SELECT MIN(login_time) AS first_login
       FROM attendance
       WHERE user_id = $1 AND DATE(login_time) = $2`,
      [userId, isoDate]
    ),
    pool.query(
      `SELECT MAX(logout_time) AS last_logout
       FROM attendance
       WHERE user_id = $1 AND logout_time IS NOT NULL AND DATE(logout_time) = $2`,
      [userId, isoDate]
    ),
  ]).then(([firstLoginResult, lastLogoutResult]: any[]) => ({
    first_login: firstLoginResult.rows[0]?.first_login || null,
    last_logout: lastLogoutResult.rows[0]?.last_logout || null,
  }) as { first_login: Date | null; last_logout: Date | null });
};

module.exports = { createLogin, setLogout, getTodayAttendance, getTodayDayBounds, getDayBoundsForDate, hasOpenLoginToday };
