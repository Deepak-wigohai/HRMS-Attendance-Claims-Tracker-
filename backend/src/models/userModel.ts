const pool = require("../config/db");

type UserIncentives = {
  morning_incentive: number | null;
  evening_incentive: number | null;
};

const getUserIncentivesById = async (userId: number): Promise<UserIncentives | null> => {
  const result = await pool.query(
    `SELECT morning_incentive, evening_incentive
     FROM users
     WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) return null;
  
  // Return with default values if null
  return {
    morning_incentive: result.rows[0].morning_incentive || 100,
    evening_incentive: result.rows[0].evening_incentive || 100
  };
};

module.exports = { getUserIncentivesById };


