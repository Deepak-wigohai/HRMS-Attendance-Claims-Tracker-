const attendanceRepo = require("../models/attendanceModel");

const login = async (userId: number) => {
  return await attendanceRepo.createLogin(userId);
};

const logout = async (userId: number) => {
  return await attendanceRepo.setLogout(userId);
};

const today = async (userId: number) => {
  return await attendanceRepo.getTodayAttendance(userId);
};

module.exports = { login, logout, today };
