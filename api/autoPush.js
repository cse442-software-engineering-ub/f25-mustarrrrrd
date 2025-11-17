// autoPush.js (FINAL PRODUCTION VERSION)

import webpush from "web-push";
import mysql from "mysql2/promise";

console.log("HOST_ENV:", process.env.HOST_ENV);

// -----------------------------------------------------
// VAPID CONFIG
// -----------------------------------------------------
webpush.setVapidDetails(
  "mailto:your-email@example.com",
  "BNct9u_rYLt-VDZs4cLNG65RzzAhferGHWWZLA_eRKfGY8TSgDQNRtLkYS7M10j7oUHiBozSPv4A0NIVuL8h6-I",
  "RY_YNLVWhhTSt4cIpmRoAVrnwTf1O7zAUEioCTVcJdc"
);

// ======================================================
// UNIVERSAL URL BUILDER FOR DEV + APTITUDE + PRODUCTION
// ======================================================

function buildAppUrl(path) {
  const cleaned = path.replace(/^\//, "");

  // 1. Localhost environment
  if (process.env.HOST_ENV === "local") {
    return `http://localhost/f25-mustarrrrrd/app/#/${cleaned}`;
  }

  // 2. Aptitude development environment
  if (process.env.HOST_ENV === "aptitude") {
    return `https://aptitude.cse.buffalo.edu/CSE442/2025-Fall/cse-442ai/auto_oh/#/${cleaned}`;
  }

  // 3. Production (“cattle”) — update this if needed
  if (process.env.HOST_ENV === "prod") {
    return `https://cattle.yourdomain.com/app/#/${cleaned}`;
  }

  // DEFAULT (fallback) — safe for desktop testing
  return `/#/${cleaned}`;
}


// -----------------------------------------------------
// DATABASE CONNECTION POOL
// -----------------------------------------------------
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "cse442_2025_fall_team_ai_db",
  connectionLimit: 10,
});

// Tracks last notified "top" user per session
const lastTopUsers = new Map();
let ticks = 0;

// -----------------------------------------------------
// SAFE WEB PUSH SEND
// -----------------------------------------------------
async function sendPush(subJson, payload) {
  try {
    const sub = JSON.parse(subJson);
    await webpush.sendNotification(sub, JSON.stringify(payload));
    return true;
  } catch (err) {
    if (err.statusCode === 410) {
    console.warn("Removing expired push subscription");

    await pool.query(
      "UPDATE users SET push_sub = NULL WHERE push_sub = ?",
      [subJson]
    );
  }
    console.error("❌ Push error:", err.statusCode || err.message);
    return false;
  }
}

// -----------------------------------------------------
// SEND OFFICE HOUR REMINDERS
// -----------------------------------------------------
async function sendOfficeHourReminders() {
  const [sessions] = await pool.query(`
    SELECT s.id, s.day_of_week, s.start_time, u.email, u.push_sub
    FROM office_hours_sessions s
      JOIN users u ON u.id = s.instructor_id
    WHERE TIME_TO_SEC(TIMEDIFF(s.start_time, NOW())) BETWEEN 0 AND 600
  `);

  for (const s of sessions) {
    if (!s.push_sub) continue;

    await sendPush(s.push_sub, {
      title: "Office Hours Reminder",
      body: `${s.day_of_week} session starts in 10 minutes.`,
      icon: "/icon.png",
      // optional: redirect instructor to their dashboard
      url: buildAppUrl("professorview")
    });

    console.log(`🔔 Reminder sent → ${s.email}`);
  }
}

// -----------------------------------------------------
// GET TOP USER FOR EACH SESSION (FAST SQL)
// -----------------------------------------------------
async function getTopUsers() {
  const [rows] = await pool.query(`
    SELECT q.session_id, q.user_email, u.push_sub
    FROM queue_entries q
      JOIN users u ON u.email = q.user_email
    WHERE q.left_at IS NULL
      AND (q.attendance IS NULL OR q.attendance = 'present')
    GROUP BY q.session_id
    ORDER BY MIN(q.joined_at)
  `);

  return rows;
}

// -----------------------------------------------------
// QUEUE WATCHER
// -----------------------------------------------------
async function checkQueueChanges() {
  const topUsers = await getTopUsers();

  for (const row of topUsers) {
    const { session_id, user_email, push_sub } = row;
    if (!push_sub) continue;

    const prev = lastTopUsers.get(session_id);

    // If top user changed → send notification
    if (prev !== user_email) {
      const url = buildAppUrl(`session/${session_id}`);

      const ok = await sendPush(push_sub, {
        title: "You're Next!",
        body: "You're now first in the queue — please be ready.",
        icon: "/icon.png",
        url
      });

      if (ok) {
        lastTopUsers.set(session_id, user_email);
        console.log(`⭐ Top change → session ${session_id} → ${user_email}`);
      }
    }
  }

  // Cleanup stale sessions
  for (const [sid, email] of lastTopUsers.entries()) {
    const stillExists = topUsers.some(
      (row) => row.session_id === sid && row.user_email === email
    );
    if (!stillExists) lastTopUsers.delete(sid);
  }
}

// -----------------------------------------------------
// MAIN LOOP
// -----------------------------------------------------
async function mainLoop() {
  ticks++;
  console.log(`\n🔁 Tick ${ticks} — ${new Date().toLocaleTimeString()}`);

  await sendOfficeHourReminders();
  await checkQueueChanges();
}

// -----------------------------------------------------
// START LOOP (15 seconds)
// -----------------------------------------------------
setInterval(mainLoop, 15000);
await mainLoop();
