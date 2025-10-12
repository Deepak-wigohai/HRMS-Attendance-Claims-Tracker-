const pool = require("../config/db");

const create = (userId: number, amount: number, note?: string, adminEmail?: string) => {
  return pool
    .query(
      `INSERT INTO redeem_requests (user_id, amount, note, admin_email)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, amount, note || null, adminEmail || null]
    )
    .then((res: any) => res.rows[0]);
};

const getById = (id: number) => {
  return pool
    .query(`SELECT * FROM redeem_requests WHERE id = $1`, [id])
    .then((res: any) => res.rows[0] || null);
};

const listByUser = (userId: number) => {
  return pool
    .query(
      `SELECT * FROM redeem_requests WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    )
    .then((res: any) => res.rows);
};

const markRedeemed = (id: number) => {
  return pool
    .query(
      `UPDATE redeem_requests SET redeemed = TRUE WHERE id = $1 RETURNING *`,
      [id]
    )
    .then((res: any) => res.rows[0]);
};

module.exports = { create, getById, listByUser, markRedeemed };


