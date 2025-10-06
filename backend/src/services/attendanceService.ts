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

const login = async (userId: number) => {
  const res = await attendanceRepo.createLogin(userId);
  const now = new Date();
  if (isAtOrBefore(now, 8, 0)) {
    const incentives = await userRepo.getUserIncentivesById(userId);
    const amount = incentives?.morning_incentive ?? 100;
    await creditEvents.upsertMorning(userId, toBusinessIsoDate(now), amount);
  }
  return res;
};

const logout = async (userId: number) => {
  const res = await attendanceRepo.setLogout(userId);
  const now = new Date();
  if (isAtOrAfter(now, 19, 0)) {
    const incentives = await userRepo.getUserIncentivesById(userId);
    const amount = incentives?.evening_incentive ?? 100;
    await creditEvents.upsertEvening(userId, toBusinessIsoDate(now), amount);
  }
  return res;
};

const today = async (userId: number) => {
  return await attendanceRepo.getTodayAttendance(userId);
};

module.exports = { login, logout, today };
