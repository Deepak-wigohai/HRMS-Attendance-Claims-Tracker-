import * as attendanceRepo from "../repositories/attendanceRepo";

export const loginAttendance = async (userId: number) => {
  return await attendanceRepo.logLogin(userId);
};

export const logoutAttendance = async (userId: number) => {
  return await attendanceRepo.logLogout(userId);
};

export const todayAttendance = async (userId: number) => {
  return await attendanceRepo.getTodayAttendance(userId);
};
