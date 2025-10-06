const attendanceRepo = require("../models/attendanceModel");
const userRepo = require("../models/userModel");
const claimsRepo = require("../models/claimsModel");
const creditEventsRepo = require("../models/creditEventsModel");
const creditsClaimsRepo = require("../models/creditsClaimsModel");
const pool = require("../config/db");

type ClaimResult = {
  date: string;
  firstLogin: string | null;
  lastLogout: string | null;
  morningEligible: boolean;
  eveningEligible: boolean;
  morningCredit: number;
  eveningCredit: number;
  totalCredit: number;
};

const formatDate = (d: Date | null) => (d ? new Date(d).toISOString() : null);

const isAtOrBefore = (time: Date | null, hh: number, mm: number) => {
  if (!time) return false;
  const t = new Date(time);
  return t.getHours() < hh || (t.getHours() === hh && t.getMinutes() <= mm);
};

const isAtOrAfter = (time: Date | null, hh: number, mm: number) => {
  if (!time) return false;
  const t = new Date(time);
  return t.getHours() > hh || (t.getHours() === hh && t.getMinutes() >= mm);
};

const computeTodayClaim = async (userId: number): Promise<ClaimResult> => {
  const [{ first_login, last_logout }, userIncentives] = await Promise.all([
    attendanceRepo.getTodayDayBounds(userId),
    userRepo.getUserIncentivesById(userId),
  ]);

  const morningRate = userIncentives?.morning_incentive ?? 100;
  const eveningRate = userIncentives?.evening_incentive ?? 100;

  const morningEligible = isAtOrBefore(first_login, 8, 0);
  const eveningEligible = isAtOrAfter(last_logout, 19, 0);

  const morningCredit = morningEligible ? morningRate : 0;
  const eveningCredit = eveningEligible ? eveningRate : 0;
  const totalCredit = morningCredit + eveningCredit;

  return {
    date: new Date().toISOString().slice(0, 10),
    firstLogin: formatDate(first_login),
    lastLogout: formatDate(last_logout),
    morningEligible,
    eveningEligible,
    morningCredit,
    eveningCredit,
    totalCredit,
  };
};

module.exports = { computeTodayClaim };

// Helpers for month iteration
const toIsoDate = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);

const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();

const computeDayClaim = async (
  userId: number,
  isoDate: string,
  morningRate: number,
  eveningRate: number
) => {
  const { first_login, last_logout } = await attendanceRepo.getDayBoundsForDate(userId, isoDate);
  const morningEligible = isAtOrBefore(first_login, 8, 0);
  const eveningEligible = isAtOrAfter(last_logout, 19, 0);
  const morningCredit = morningEligible ? morningRate : 0;
  const eveningCredit = eveningEligible ? eveningRate : 0;
  return {
    date: isoDate,
    morningEligible,
    eveningEligible,
    morningCredit,
    eveningCredit,
    totalCredit: morningCredit + eveningCredit,
    firstLogin: first_login ? new Date(first_login).toISOString() : null,
    lastLogout: last_logout ? new Date(last_logout).toISOString() : null,
  };
};

const computeMonthClaim = async (userId: number, year: number, month: number) => {
  const rows = await creditsClaimsRepo.listByMonth(userId, year, month);
  const claims = rows.map((r: any) => ({
    id: r.id,
    amount: Number(r.amount || 0),
    note: r.note || null,
    claimedAt: r.claimed_at ? new Date(r.claimed_at).toISOString() : null,
  }));
  const count = claims.length;
  const totalClaimed = claims.reduce((sum: number, c: any) => sum + (Number.isFinite(c.amount) ? c.amount : 0), 0);
  return { year, month, count, totalClaimed, claims };
};


module.exports.computeMonthClaim = computeMonthClaim;

// Available credits = earned - claimed
const getAvailableCredits = async (userId: number) => {
  const [earned, claimed] = await Promise.all([
    creditEventsRepo.sumEarned(userId),
    creditsClaimsRepo.sumClaimed(userId),
  ]);
  return { available: Math.max(0, earned - claimed), earned, claimed };
};

// Redeem credits with simple transaction
const redeemCredits = async (userId: number, amount: number, note?: string) => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid amount");
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const earnedRes = await client.query(
      `SELECT COALESCE(SUM(amount),0) AS total FROM credit_events WHERE user_id = $1`,
      [userId]
    );
    const claimedRes = await client.query(
      `SELECT COALESCE(SUM(amount),0) AS total FROM credits_claims WHERE user_id = $1`,
      [userId]
    );
    const earned = Number(earnedRes.rows[0].total || 0);
    const claimed = Number(claimedRes.rows[0].total || 0);
    const available = Math.max(0, earned - claimed);
    if (amount > available) {
      throw new Error("Insufficient available credits");
    }
    await client.query(
      `INSERT INTO credits_claims (user_id, amount, note) VALUES ($1, $2, $3)`,
      [userId, amount, note || null]
    );
    await client.query("COMMIT");
    return { redeemed: amount, available: available - amount };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

module.exports.getAvailableCredits = getAvailableCredits;
module.exports.redeemCredits = redeemCredits;


