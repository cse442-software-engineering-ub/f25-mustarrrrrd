import webpush from "web-push";
import mysql from "mysql2/promise";

// Your VAPID keys
const vapidKeys = {
  publicKey: "BNct9u_rYLt-VDZs4cLNG65RzzAhferGHWWZLA_eRKfGY8TSgDQNRtLkYS7M10j7oUHiBozSPv4A0NIVuL8h6-I",
  privateKey: "RY_YNLVWhhTSt4cIpmRoAVrnwTf1O7zAUEioCTVcJdc",
};

webpush.setVapidDetails(
  "mailto:your-email@buffalo.edu",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Connect to DB
const db = await mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "cse442_2025_fall_team_ai_db",
});

console.log("✅ Connected to MySQL");

const [rows] = await db.query("SELECT id, email, push_sub FROM users WHERE push_sub IS NOT NULL");

if (rows.length === 0) {
  console.log("⚠️ No subscribed users found.");
  process.exit(0);
}

console.log(`📬 Sending notifications to ${rows.length} users...`);

for (const row of rows) {
  try {
    const subscription = JSON.parse(row.push_sub);

    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: "Office Hours Reminder",
        body: "Your office hours start in 10 minutes!",
        icon: "/app/assets/icon-192.png",

        // *** IMPORTANT ***
        // Always provide a URL so the SW can redirect properly
        url: `${process.env.PUSH_BASE || "http://localhost/f25-mustarrrrrd/app"}/#/dashboard`
      })
    );

    console.log(`✅ Sent notification to ${row.email}`);
  } catch (err) {
    console.error(`❌ Error sending to ${row.email}:`, err.body || err);
  }
}

await db.end();
console.log("🏁 Done!");
