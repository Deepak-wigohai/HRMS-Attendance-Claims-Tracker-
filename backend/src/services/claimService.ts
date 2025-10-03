import db from "../config/db";
import dayjs from "dayjs";

// Calculate credit for a single attendance record
export const calculateDailyCredit = (loginTime: Date, logoutTime: Date | null): number => {
  let credit = 0;

  const login = dayjs(loginTime);
  const logout = logoutTime ? dayjs(logoutTime) : null;

  if (login.hour() < 8 || (login.hour() === 8 && login.minute() === 0)) {
    credit += 100;
  }

  if (logout) {
    if (logout.hour() > 19 || (logout.hour() === 19 && logout.minute() === 0)) {
      credit += 100;
    }
  }

  return credit;
};

// Get all attendance for a month and calculate credits
export const calculateMonthlyCredits = async (userId: number, month: string) => {
  const result = await db.query(
    `SELECT * FROM attendance 
     WHERE user_id=$1 
       AND TO_CHAR(created_at, 'YYYY-MM')=$2`,
    [userId, month]
  );

  let total = 0;
  const days = result.rows.map((row: any) => {
    const credit = calculateDailyCredit(row.login_time, row.logout_time);
    total += credit;
    return {
      date: row.created_at,
      login: row.login_time,
      logout: row.logout_time,
      credit,
    };
  });

  return { days, total };
};

// Save claim in DB
export const submitClaim = async (userId: number, month: string, total: number) => {
  const result = await db.query(
    `INSERT INTO claims (user_id, month, total_credit, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING *`,
    [userId, month, total]
  );
  return result.rows[0];
};
