const pool = require("../config/db");

const insertClaim = (userId: number, amount: number, note?: string) => {
  return pool
    .query(
      `INSERT INTO credits_claims (user_id, amount, note)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, amount, note || null]
    )
    .then((res: any) => res.rows[0]);
};

const sumClaimed = (userId: number) => {
  return pool
    .query(
      `SELECT COALESCE(SUM(amount),0) AS total FROM credits_claims WHERE user_id = $1`,
      [userId]
    )
    .then((res: any) => Number(res.rows[0]?.total || 0));
};

const listByMonth = (userId: number, year: number, month: number) => {
  return pool
    .query(
      `SELECT id, amount, note, claimed_at
       FROM credits_claims
       WHERE user_id = $1
         AND date_part('year', claimed_at) = $2
         AND date_part('month', claimed_at) = $3
       ORDER BY claimed_at DESC`,
      [userId, year, month]
    )
    .then((res: any) => res.rows);
};

module.exports = { insertClaim, sumClaimed, listByMonth };


