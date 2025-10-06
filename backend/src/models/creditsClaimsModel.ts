const pool = require("../config/db");

const insertClaim = async (userId: number, amount: number, note?: string) => {
  const res = await pool.query(
    `INSERT INTO credits_claims (user_id, amount, note)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, amount, note || null]
  );
  return res.rows[0];
};

const sumClaimed = async (userId: number) => {
  const res = await pool.query(
    `SELECT COALESCE(SUM(amount),0) AS total FROM credits_claims WHERE user_id = $1`,
    [userId]
  );
  return Number(res.rows[0]?.total || 0);
};

module.exports = { insertClaim, sumClaimed };


