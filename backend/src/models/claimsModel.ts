const pool = require("../config/db");

type MonthKey = { userId: number; year: number; month: number };

const getByMonth = ({ userId, year, month }: MonthKey) => {
  return pool
    .query(
      `SELECT * FROM claims WHERE user_id = $1 AND year = $2 AND month = $3`,
      [userId, year, month]
    )
    .then((res: any) => res.rows[0] || null);
};

const upsert = (
  { userId, year, month }: MonthKey,
  data: { morning_days: number; evening_days: number; total_amount: number; breakdown: any }
) => {
  // Ensure breakdown is properly JSON stringified
  const breakdownJson = typeof data.breakdown === 'string' 
    ? data.breakdown 
    : JSON.stringify(data.breakdown);
    
  return pool
    .query(
      `INSERT INTO claims (user_id, year, month, morning_days, evening_days, total_amount, breakdown)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, year, month)
       DO UPDATE SET
         morning_days = EXCLUDED.morning_days,
         evening_days = EXCLUDED.evening_days,
         total_amount = EXCLUDED.total_amount,
         breakdown = EXCLUDED.breakdown,
         updated_at = NOW()
       RETURNING *`,
      [userId, year, month, data.morning_days, data.evening_days, data.total_amount, breakdownJson]
    )
    .then((res: any) => res.rows[0]);
};

module.exports = { getByMonth, upsert };


