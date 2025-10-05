const attendanceRepo = require("../models/attendanceModel");
const userRepo = require("../models/userModel");
const claimsRepo = require("../models/claimsModel");

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
  const incentives = await userRepo.getUserIncentivesById(userId);
  const morningRate = incentives?.morning_incentive ?? 100;
  const eveningRate = incentives?.evening_incentive ?? 100;

  const totalDays = daysInMonth(year, month);
  const breakdown = [] as any[];
  let morningDays = 0;
  let eveningDays = 0;
  let totalAmount = 0;

  for (let d = 1; d <= totalDays; d++) {
    const isoDate = toIsoDate(year, month, d);
    const day = await computeDayClaim(userId, isoDate, morningRate, eveningRate);
    if (day.morningEligible) morningDays += 1;
    if (day.eveningEligible) eveningDays += 1;
    totalAmount += day.totalCredit;
    breakdown.push(day);
  }

  return { year, month, morningDays, eveningDays, totalAmount, breakdown };
};

const submitMonthClaim = async (userId: number, year: number, month: number) => {
  const computed = await computeMonthClaim(userId, year, month);
  const saved = await claimsRepo.upsert(
    { userId, year, month },
    {
      morning_days: computed.morningDays,
      evening_days: computed.eveningDays,
      total_amount: computed.totalAmount,
      breakdown: computed.breakdown,
    }
  );
  return saved;
};

module.exports.computeMonthClaim = computeMonthClaim;
module.exports.submitMonthClaim = submitMonthClaim;


