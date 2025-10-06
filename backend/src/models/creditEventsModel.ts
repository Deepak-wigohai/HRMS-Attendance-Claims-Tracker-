const pool = require("../config/db");

const upsertMorning = async (userId: number, isoDate: string, amount: number) => {
  await pool.query(
    `INSERT INTO credit_events (user_id, date, type, amount)
     VALUES ($1, $2::date, 'morning', $3)
     ON CONFLICT (user_id, date, type) DO NOTHING`,
    [userId, isoDate, amount]
  );
};

const upsertEvening = async (userId: number, isoDate: string, amount: number) => {
  await pool.query(
    `INSERT INTO credit_events (user_id, date, type, amount)
     VALUES ($1, $2::date, 'evening', $3)
     ON CONFLICT (user_id, date, type) DO NOTHING`,
    [userId, isoDate, amount]
  );
};

const listByMonth = async (userId: number, year: number, month: number) => {
  const res = await pool.query(
    `SELECT date,
            SUM(CASE WHEN type='morning' THEN amount ELSE 0 END) AS morning_credit,
            SUM(CASE WHEN type='evening' THEN amount ELSE 0 END) AS evening_credit,
            SUM(amount) AS total_credit
     FROM credit_events
     WHERE user_id = $1
       AND date >= make_date($2, $3, 1)
       AND date < (make_date($2, $3, 1) + INTERVAL '1 month')
     GROUP BY date
     HAVING SUM(amount) > 0
     ORDER BY date`,
    [userId, year, month]
  );
  return res.rows;
};

const sumEarned = async (userId: number) => {
  const res = await pool.query(
    `SELECT COALESCE(SUM(amount),0) AS total FROM credit_events WHERE user_id = $1`,
    [userId]
  );
  return Number(res.rows[0]?.total || 0);
};

module.exports = { upsertMorning, upsertEvening, listByMonth, sumEarned };


