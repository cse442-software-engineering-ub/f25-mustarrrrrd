import webpush from "web-push";
import mysql from "mysql2/promise";

const vapidKeys = {
  publicKey: "BNct9u_rYLt-VDZs4cLNG65RzzAhferGHWWZLA_eRKfGY8TSgDQNRtLkYS7M10j7oUHiBozSPv4A0NIVuL8h6-I",
  privateKey: "RY_YNLVWhhTSt4cIpmRoAVrnwTf1O7zAUEioCTVcJdc",
};

webpush.setVapidDetails(
  "mailto:you@example.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "cse442_2025_fall_team_ai_db",
});

const lastTopUsers = new Map(); // session_id → user_email

async function sendNotification(subJson, payload) {
  try {
    const sub = JSON.parse(subJson);
    await webpush.sendNotification(sub, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error("❌ Push error:", err.message);
    return false;
  }
}

// --- Office Hour Reminder ---
async function sendOfficeHourReminders() {
  const [sessions] = await pool.query(`
    SELECT s.*, u.email, u.push_sub
    FROM office_hours_sessions s
    JOIN users u ON u.id = s.instructor_id
    WHERE TIME_TO_SEC(TIMEDIFF(s.start_time, NOW())) BETWEEN 0 AND 600
  `);

  for (const s of sessions) {
    if (!s.push_sub) continue;
    const payload = {
      title: "Office Hours Reminder",
      body: `${s.day_of_week} session starts in 10 minutes.`,
      icon: "/icon.png",
    };
    await sendNotification(s.push_sub, payload);
    console.log(`✅ Reminder sent to ${s.email}`);
  }
}

// --- Queue watcher ---
async function checkQueueChanges() {
  const [rows] = await pool.query(`
    SELECT q.session_id, q.user_email, u.push_sub
    FROM queue_entries q
    JOIN users u ON u.email = q.user_email
    WHERE q.left_at IS NULL
      AND (q.attendance IS NULL OR q.attendance = 'present')
      AND q.joined_at = (
        SELECT MIN(joined_at)
        FROM queue_entries q2
        WHERE q2.session_id = q.session_id
          AND q2.left_at IS NULL
          AND (q2.attendance IS NULL OR q2.attendance = 'present')
      )
  `);

  for (const row of rows) {
    if (!row.push_sub) continue;
    const lastTop = lastTopUsers.get(row.session_id);

    if (lastTop !== row.user_email) {
      // new top user — send “you’re next” alert
      const payload = {
        title: "You're next!",
        body: "You're at the top of the queue — please be ready!",
        icon: "/icon.png",
      };
      const ok = await sendNotification(row.push_sub, payload);
      if (ok) {
        lastTopUsers.set(row.session_id, row.user_email);
        console.log(`✅ "You're next" sent to ${row.user_email} (session ${row.session_id})`);
      }
    }
  }

  // Clear out sessions that no longer have active queues
  for (const [sessionId, email] of lastTopUsers.entries()) {
    const stillActive = rows.some(r => r.session_id === sessionId && r.user_email === email);
    if (!stillActive) lastTopUsers.delete(sessionId);
  }
}

// --- Main loop ---
async function mainLoop() {
  await sendOfficeHourReminders();
  await checkQueueChanges();
}

setInterval(mainLoop, 15 * 1000); // every 15 seconds
await mainLoop();
