const attendanceRepo = require("../models/attendanceModel");
const userRepo = require("../models/userModel");
const claimsRepo = require("../models/claimsModel");
const creditEventsRepo = require("../models/creditEventsModel");
const creditsClaimsRepo = require("../models/creditsClaimsModel");
const pool = require("../config/db");
const redeemRequestsRepo = require("../models/redeemRequestsModel");

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
  const businessIsoDate = new Date().toISOString().slice(0, 10);
  const [{ first_login, last_logout }, userIncentives, recorded] = await Promise.all([
    attendanceRepo.getTodayDayBounds(userId),
    userRepo.getUserIncentivesById(userId),
    creditEventsRepo.getByDate(userId, businessIsoDate),
  ]);

  const morningRate = Math.max(0, userIncentives?.morning_incentive ?? 100);
  const eveningRate = Math.max(0, userIncentives?.evening_incentive ?? 100);

  const morningEligible = isAtOrBefore(first_login, 8, 0) && morningRate > 0;
  const eveningEligible = isAtOrAfter(last_logout, 19, 0) && eveningRate > 0;

  // Show only amounts actually recorded for today
  const morningCredit = morningRate > 0 ? Number(recorded?.morning_credit || 0) : 0;
  const eveningCredit = eveningRate > 0 ? Number(recorded?.evening_credit || 0) : 0;
  const totalCredit = Number(recorded?.total_credit || (morningCredit + eveningCredit));

  return {
    date: businessIsoDate,
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

// Month summary: earned in month vs claimed in month, remaining claimable
const getMonthSummary = async (userId: number, year: number, month: number) => {
  const [earnedInMonth, claimedInMonth] = await Promise.all([
    creditEventsRepo.sumByMonth(userId, year, month),
    creditsClaimsRepo.sumClaimedByMonth(userId, year, month),
  ]);
  const remaining = Math.max(0, earnedInMonth - claimedInMonth);
  return { year, month, earnedInMonth, claimedInMonth, remaining };
};

module.exports.getMonthSummary = getMonthSummary;

const getMonthEarnings = async (userId: number, year: number, month: number) => {
  const rows = await creditEventsRepo.listEarningsByMonth(userId, year, month);
  return rows.map((r: any) => ({
    date: r.date instanceof Date ? r.date.toISOString().slice(0,10) : r.date,
    morningCredit: Number(r.morning_credit || 0),
    eveningCredit: Number(r.evening_credit || 0),
    totalCredit: Number(r.total_credit || 0),
  }));
};

module.exports.getMonthEarnings = getMonthEarnings;

// Admin email helpers
const getAdminEmails = () => String(process.env.ADMIN_EMAILS || "").split(",").map((s: string) => s.trim()).filter(Boolean);

async function createRedeemRequest(userId: number, amount: number, note?: string, adminEmail?: string) {
  const admins = getAdminEmails();
  if (!admins.length) throw new Error("No admin emails configured");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");
  if (adminEmail && !admins.includes(adminEmail)) throw new Error("Invalid admin email");

  const { available } = await module.exports.getAvailableCredits(userId);
  if (amount > available) throw new Error("Amount exceeds available credits");

  const targetAdmin = adminEmail || admins[0];
  return redeemRequestsRepo.create(userId, amount, note, targetAdmin);
}

async function listRedeemRequests(userId: number) {
  return redeemRequestsRepo.listByUser(userId);
}

async function getRedeemRequestById(id: number) {
  return redeemRequestsRepo.getById(id);
}

async function markRequestRedeemed(id: number) {
  return redeemRequestsRepo.markRedeemed(id);
}

module.exports.createRedeemRequest = createRedeemRequest;
module.exports.listRedeemRequests = listRedeemRequests;
module.exports.getRedeemRequestById = getRedeemRequestById;
module.exports.markRequestRedeemed = markRequestRedeemed;

// Admin helpers
async function adminListAllRedeemRequests() {
  return redeemRequestsRepo.listAll();
}

async function adminApproveRedeemRequest(id: number) {
  const row = await redeemRequestsRepo.setApproved(id, true);
  return row;
}

async function adminDenyRedeemRequest(id: number) {
  // Delete row or mark denied; here we delete the request
  const pool = require("../config/db");
  await pool.query(`DELETE FROM redeem_requests WHERE id = $1`, [id]);
  return { ok: true };
}

module.exports.adminListAllRedeemRequests = adminListAllRedeemRequests;
module.exports.adminApproveRedeemRequest = adminApproveRedeemRequest;
module.exports.adminDenyRedeemRequest = adminDenyRedeemRequest;


