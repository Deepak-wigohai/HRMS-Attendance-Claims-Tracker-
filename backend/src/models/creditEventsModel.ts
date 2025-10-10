const pool = require("../config/db");

const upsertMorning = (userId: number, isoDate: string, amount: number) => {
  return pool.query(
    `INSERT INTO credit_events (user_id, date, type, amount)
     VALUES ($1, $2::date, 'morning', $3)
     ON CONFLICT (user_id, date, type) DO NOTHING`,
    [userId, isoDate, amount]
  );
};

const upsertEvening = (userId: number, isoDate: string, amount: number) => {
  return pool.query(
    `INSERT INTO credit_events (user_id, date, type, amount)
     VALUES ($1, $2::date, 'evening', $3)
     ON CONFLICT (user_id, date, type) DO NOTHING`,
    [userId, isoDate, amount]
  );
};

const listByMonth = (userId: number, year: number, month: number) => {
  return pool
    .query(
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
    )
    .then((res: any) => res.rows);
};

const sumEarned = (userId: number) => {
  return pool
    .query(
      `SELECT COALESCE(SUM(amount),0) AS total FROM credit_events WHERE user_id = $1`,
      [userId]
    )
    .then((res: any) => Number(res.rows[0]?.total || 0));
};

const getByDate = (userId: number, isoDate: string) => {
  return pool
    .query(
      `SELECT
         SUM(CASE WHEN type = 'morning' THEN amount ELSE 0 END) AS morning_credit,
         SUM(CASE WHEN type = 'evening' THEN amount ELSE 0 END) AS evening_credit,
         SUM(amount) AS total_credit
       FROM credit_events
       WHERE user_id = $1 AND date = $2::date`,
      [userId, isoDate]
    )
    .then((res: any) => {
      const row = res.rows[0] || {};
      return {
        morning_credit: Number(row.morning_credit || 0),
        evening_credit: Number(row.evening_credit || 0),
        total_credit: Number(row.total_credit || 0),
      };
    });
};

module.exports = { upsertMorning, upsertEvening, listByMonth, sumEarned, getByDate };

const sumByMonth = (userId: number, year: number, month: number) => {
  return pool
    .query(
      `SELECT
         COALESCE(SUM(amount),0) AS total
       FROM credit_events
       WHERE user_id = $1
         AND date >= make_date($2, $3, 1)
         AND date < (make_date($2, $3, 1) + INTERVAL '1 month')`,
      [userId, year, month]
    )
    .then((res: any) => Number(res.rows[0]?.total || 0));
};

module.exports.sumByMonth = sumByMonth;

const listEarningsByMonth = (userId: number, year: number, month: number) => {
  return pool
    .query(
      `SELECT date,
              SUM(CASE WHEN type='morning' THEN amount ELSE 0 END) AS morning_credit,
              SUM(CASE WHEN type='evening' THEN amount ELSE 0 END) AS evening_credit,
              SUM(amount) AS total_credit
       FROM credit_events
       WHERE user_id = $1
         AND date >= make_date($2, $3, 1)
         AND date < (make_date($2, $3, 1) + INTERVAL '1 month')
       GROUP BY date
       ORDER BY date`,
      [userId, year, month]
    )
    .then((res: any) => res.rows);
};

module.exports.listEarningsByMonth = listEarningsByMonth;


