const cron = require("node-cron");
const pool = require("./config/db");
const { sendMail } = require("./services/mailer");

function formatCurrency(amount: number) {
  const n = Number.isFinite(amount) ? amount : 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

async function fetchWeeklyAndTotals() {
  // Week window: last 7 days including today
  const query = `
    WITH users_list AS (
      SELECT id, email FROM users WHERE deleted_at IS NULL
    ),
    weekly_claims AS (
      SELECT cc.user_id, COALESCE(SUM(cc.amount),0) AS weekly_claimed
      FROM credits_claims cc
      WHERE cc.claimed_at >= (CURRENT_DATE - INTERVAL '7 days')
        AND cc.claimed_at < (CURRENT_DATE + INTERVAL '1 day')
      GROUP BY cc.user_id
    ),
    total_claims AS (
      SELECT cc.user_id, COALESCE(SUM(cc.amount),0) AS total_claimed
      FROM credits_claims cc
      GROUP BY cc.user_id
    )
    SELECT u.id, u.email,
           COALESCE(w.weekly_claimed, 0) AS weekly_claimed,
           COALESCE(t.total_claimed, 0) AS total_claimed
    FROM users_list u
    LEFT JOIN weekly_claims w ON w.user_id = u.id
    LEFT JOIN total_claims t ON t.user_id = u.id
    ORDER BY u.email ASC;
  `;

  const res = await pool.query(query);
  return res.rows.map((r: any) => ({
    userId: r.id,
    email: r.email,
    weeklyClaimed: Number(r.weekly_claimed || 0),
    totalClaimed: Number(r.total_claimed || 0),
  }));
}

function buildEmailHtml(rows: Array<{ email: string; weeklyClaimed: number; totalClaimed: number }>) {
  const date = new Date();
  const title = `Weekly Claims Summary — ${date.toLocaleDateString()}`;
  const header = `<h2>${title}</h2>`;
  if (!rows.length) {
    return header + `<p>No users found.</p>`;
  }
  const tableRows = rows
    .map(
      (r: { email: string; weeklyClaimed: number; totalClaimed: number }) =>
        `<tr>
          <td style="padding:8px 12px;border:1px solid #eee;">${r.email}</td>
          <td style="padding:8px 12px;border:1px solid #eee;text-align:right;">${formatCurrency(
            r.weeklyClaimed
          )}</td>
          <td style="padding:8px 12px;border:1px solid #eee;text-align:right;">${formatCurrency(
            r.totalClaimed
          )}</td>
        </tr>`
    )
    .join("");
  return (
    header +
    `<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #eee;">
      <thead>
        <tr style="background:#f7f7f7;">
          <th style="padding:8px 12px;border:1px solid #eee;text-align:left;">User</th>
          <th style="padding:8px 12px;border:1px solid #eee;text-align:right;">Claims This Week</th>
          <th style="padding:8px 12px;border:1px solid #eee;text-align:right;">Total Claims</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>`
  );
}

async function sendWeeklySummary() {
  const adminEmails = String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);
  if (!adminEmails.length) {
    console.warn("[scheduler] No ADMIN_EMAILS configured; skipping weekly summary.");
    return;
  }

  const rows = await fetchWeeklyAndTotals();
  const html = buildEmailHtml(rows);
  const text =
    "Weekly Claims Summary\n\n" +
    rows
      .map((r: { email: string; weeklyClaimed: number; totalClaimed: number }) => `${r.email}  | week: ${r.weeklyClaimed} | total: ${r.totalClaimed}`)
      .join("\n");

  await Promise.all(
    adminEmails.map((to: string) =>
      sendMail({
        to,
        subject: "Weekly Claims Summary",
        text,
        html,
      })
    )
  );
  console.log(`[scheduler] Weekly summary sent to ${adminEmails.length} admin(s).`);
}

function initSchedulers() {
  // Every Friday at 18:00 server time
  const expression = "0 18 * * 5";
  cron.schedule(expression, () => {
    sendWeeklySummary().catch((err: any) => {
      console.error("[scheduler] Failed to send weekly summary:", err);
    });
  });

  if (String(process.env.RUN_WEEKLY_SUMMARY_ON_STARTUP || "").toLowerCase() === "true") {
    sendWeeklySummary().catch((err: any) => console.error(err));
  }

  // Daily at 21:00 server time
  const DAILY_21_CRON = "0 21 * * *";
  cron.schedule(DAILY_21_CRON, () => {
    sendDailyAttendanceSummary().catch((err: any) => {
      console.error("[scheduler] Failed to send daily attendance summary:", err);
    });
  });
  if (String(process.env.RUN_DAILY_SUMMARY_ON_STARTUP || "").toLowerCase() === "true") {
    sendDailyAttendanceSummary().catch((err: any) => console.error(err));
  }
}

module.exports = { initSchedulers, sendWeeklySummary };

// ===== Daily Attendance Summary (21:00) =====

function toLocalIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isAtOrBefore(time: Date | null, hh: number, mm: number) {
  if (!time) return false;
  const h = time.getHours();
  const m = time.getMinutes();
  return h < hh || (h === hh && m <= mm);
}

function isAtOrAfter(time: Date | null, hh: number, mm: number) {
  if (!time) return false;
  const h = time.getHours();
  const m = time.getMinutes();
  return h > hh || (h === hh && m >= mm);
}

async function fetchTodayAttendanceSummary() {
  const query = `
    SELECT u.id, u.email,
      (
        SELECT MIN(a.login_time) FROM attendance a
        WHERE a.user_id = u.id AND DATE(a.login_time) = CURRENT_DATE
      ) AS first_login,
      (
        SELECT MAX(a.logout_time) FROM attendance a
        WHERE a.user_id = u.id AND a.logout_time IS NOT NULL AND DATE(a.logout_time) = CURRENT_DATE
      ) AS last_logout
    FROM users u
    WHERE u.deleted_at IS NULL
    ORDER BY u.email ASC;
  `;
  const res = await pool.query(query);
  const rows = res.rows.map((r: any) => {
    const firstLogin = r.first_login ? new Date(r.first_login) : null;
    const lastLogout = r.last_logout ? new Date(r.last_logout) : null;
    const { MORNING_CUTOFF_HOUR, MORNING_CUTOFF_MINUTE, EVENING_CUTOFF_HOUR, EVENING_CUTOFF_MINUTE } = require("./config/timings");
    const morningEligible = isAtOrBefore(firstLogin, MORNING_CUTOFF_HOUR, MORNING_CUTOFF_MINUTE);
    const eveningEligible = isAtOrAfter(lastLogout, EVENING_CUTOFF_HOUR, EVENING_CUTOFF_MINUTE) && !isAtOrAfter(firstLogin, EVENING_CUTOFF_HOUR, EVENING_CUTOFF_MINUTE);
    return {
      userId: Number(r.id),
      email: r.email || null,
      firstLogin,
      lastLogout,
      morningEligible,
      eveningEligible,
    };
  }).filter((r: any) => r.firstLogin || r.lastLogout); // include only users with any activity today
  return rows;
}

function buildDailyAttendanceEmailHtml(rows: Array<{ email: string | null; firstLogin: Date | null; lastLogout: Date | null; morningEligible: boolean; eveningEligible: boolean }>) {
  const date = new Date();
  const title = `Daily Attendance Summary — ${toLocalIsoDate(date)}`;
  const header = `<h2>${title}</h2>`;
  if (!rows.length) return header + `<p>No attendance activity today.</p>`;
  const fmt = (d: Date | null) => (d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');
  const tableRows = rows.map((r) => `
    <tr>
      <td style="padding:8px 12px;border:1px solid #eee;">${r.email || '—'}</td>
      <td style="padding:8px 12px;border:1px solid #eee;text-align:center;">${fmt(r.firstLogin)}</td>
      <td style="padding:8px 12px;border:1px solid #eee;text-align:center;">${fmt(r.lastLogout)}</td>
      <td style="padding:8px 12px;border:1px solid #eee;text-align:center;">${r.morningEligible ? 'Yes' : 'No'}</td>
      <td style="padding:8px 12px;border:1px solid #eee;text-align:center;">${r.eveningEligible ? 'Yes' : 'No'}</td>
    </tr>
  `).join("");
  return (
    header +
    `<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #eee;">
      <thead>
        <tr style="background:#f7f7f7;">
          <th style="padding:8px 12px;border:1px solid #eee;text-align:left;">User</th>
          <th style="padding:8px 12px;border:1px solid #eee;text-align:center;">First Login</th>
          <th style="padding:8px 12px;border:1px solid #eee;text-align:center;">Last Logout</th>
          <th style="padding:8px 12px;border:1px solid #eee;text-align:center;">Morning Eligible</th>
          <th style="padding:8px 12px;border:1px solid #eee;text-align:center;">Evening Eligible</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>`
  );
}

async function sendDailyAttendanceSummary() {
  const adminEmails = String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);
  if (!adminEmails.length) {
    console.warn("[scheduler] No ADMIN_EMAILS configured; skipping daily attendance summary.");
    return;
  }
  const rows = await fetchTodayAttendanceSummary();
  const html = buildDailyAttendanceEmailHtml(rows);
  const fmt = (d: Date | null) => (d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');
  const textLines = rows.map((r: any) => `${r.email || '—'} | in: ${fmt(r.firstLogin)} | out: ${fmt(r.lastLogout)} | morning: ${r.morningEligible ? 'Yes' : 'No'} | evening: ${r.eveningEligible ? 'Yes' : 'No'}`);
  const text = `Daily Attendance Summary — ${toLocalIsoDate(new Date())}\n\n` + (textLines.join("\n") || 'No attendance activity today.');

  await Promise.all(
    adminEmails.map((to: string) =>
      sendMail({
        to,
        subject: `Daily Attendance Summary`,
        text,
        html,
      })
    )
  );
  console.log(`[scheduler] Daily attendance summary sent to ${adminEmails.length} admin(s).`);
}

module.exports.sendDailyAttendanceSummary = sendDailyAttendanceSummary;


