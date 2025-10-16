// Centralized timing configuration for attendance/claims windows

// Default cutoffs (24h): morning <= 08:00, evening >= 19:00
const MORNING_CUTOFF_HOUR = Number(process.env.MORNING_CUTOFF_HOUR || 8);
const MORNING_CUTOFF_MINUTE = Number(process.env.MORNING_CUTOFF_MINUTE || 0);
const EVENING_CUTOFF_HOUR = Number(process.env.EVENING_CUTOFF_HOUR || 19);
const EVENING_CUTOFF_MINUTE = Number(process.env.EVENING_CUTOFF_MINUTE || 0);

module.exports = {
  MORNING_CUTOFF_HOUR,
  MORNING_CUTOFF_MINUTE,
  EVENING_CUTOFF_HOUR,
  EVENING_CUTOFF_MINUTE,
};


