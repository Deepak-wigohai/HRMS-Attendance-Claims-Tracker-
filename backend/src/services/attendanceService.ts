const attendanceRepo = require("../models/attendanceModel");
const userRepo = require("../models/userModel");
const creditEvents = require("../models/creditEventsModel");

const toBusinessIsoDate = (d: Date) => d.toISOString().slice(0, 10);
const isAtOrBefore = (time: Date, hh: number, mm: number) => {
  const h = time.getHours();
  const m = time.getMinutes();
  return h < hh || (h === hh && m <= mm);
};
const isAtOrAfter = (time: Date, hh: number, mm: number) => {
  const h = time.getHours();
  const m = time.getMinutes();
  return h > hh || (h === hh && m >= mm);
};

const login = (userId: number) => {
  const now = new Date();
  const shouldCreditMorning = isAtOrBefore(now, 8, 0);
  return attendanceRepo.createLogin(userId).then((res: any) => {
    if (!shouldCreditMorning) return res;
    return userRepo
      .getUserIncentivesById(userId)
      .then((incentives: any) => incentives?.morning_incentive ?? 100)
      .then((amount: number) =>
        creditEvents.upsertMorning(userId, toBusinessIsoDate(now), amount).then(() => res)
      );
  });
};

const logout = (userId: number) => {
  const now = new Date();
  const shouldCreditEvening = isAtOrAfter(now, 19, 0);
  return attendanceRepo.setLogout(userId).then((res: any) => {
    if (!shouldCreditEvening) return res;
    return userRepo
      .getUserIncentivesById(userId)
      .then((incentives: any) => incentives?.evening_incentive ?? 100)
      .then((amount: number) =>
        creditEvents.upsertEvening(userId, toBusinessIsoDate(now), amount).then(() => res)
      );
  });
};

const today = (userId: number) => {
  return attendanceRepo.getTodayAttendance(userId);
};

module.exports = { login, logout, today };
