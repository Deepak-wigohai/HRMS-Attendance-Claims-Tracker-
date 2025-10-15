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
}

module.exports = { initSchedulers, sendWeeklySummary };


