<?php
// admin/analytics_overview.php — System-wide analytics overview
require_once __DIR__ . '/../_shared.php';
require_once __DIR__ . '/../admin_auth.php';
set_cors_headers();
sess_start();


$admin = require_admin();
$pdo = pdo();

$stats = [];

// User statistics
$user_stats = $pdo->query('
    SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = "student" THEN 1 END) as students,
        COUNT(CASE WHEN role = "ta" THEN 1 END) as tas,
        COUNT(CASE WHEN role = "professor" THEN 1 END) as professors,
        COUNT(CASE WHEN role = "admin" THEN 1 END) as admins,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_users,
        COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactive_users
    FROM users
')->fetch(PDO::FETCH_ASSOC);

$stats['users'] = $user_stats;

// User growth (last 30 days)
$user_growth = $pdo->query('
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM users
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY DATE(created_at)
    ORDER BY date
')->fetchAll(PDO::FETCH_ASSOC);

$stats['user_growth'] = $user_growth;

// Course statistics
$course_stats = $pdo->query('
    SELECT
        COUNT(*) as total_courses,
        AVG(enrollment_count) as avg_enrollments
    FROM (
        SELECT c.id, COUNT(e.user_id) as enrollment_count
        FROM courses c
        LEFT JOIN enrollments e ON c.id = e.course_id
        GROUP BY c.id
    ) as course_enrollments
')->fetch(PDO::FETCH_ASSOC);

$stats['courses'] = $course_stats;

// Queue statistics
$queue_stats = $pdo->query('
    SELECT
        COUNT(*) as total_entries,
        COUNT(CASE WHEN left_at IS NULL THEN 1 END) as active_entries,
        COUNT(CASE WHEN attendance = "present" THEN 1 END) as present_count,
        COUNT(CASE WHEN attendance = "absent" THEN 1 END) as absent_count,
        AVG(CASE WHEN left_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, joined_at, left_at) END) as avg_wait_minutes
    FROM queue_entries
')->fetch(PDO::FETCH_ASSOC);

$stats['queue'] = $queue_stats;

// Queue entries per day (last 30 days)
$queue_activity = $pdo->query('
    SELECT DATE(joined_at) as date, COUNT(*) as count
    FROM queue_entries
    WHERE joined_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY DATE(joined_at)
    ORDER BY date
')->fetchAll(PDO::FETCH_ASSOC);

$stats['queue_activity'] = $queue_activity;

// Office hours sessions
$session_stats = $pdo->query('
    SELECT COUNT(*) as total_sessions
    FROM office_hours_sessions
')->fetch(PDO::FETCH_ASSOC);

$stats['sessions'] = $session_stats;

// Attendance rate
$attendance_rate = $pdo->query('
    SELECT
        COUNT(CASE WHEN attendance = "present" THEN 1 END) as present,
        COUNT(CASE WHEN attendance = "absent" THEN 1 END) as absent,
        COUNT(*) as total_with_attendance
    FROM queue_entries
    WHERE attendance IS NOT NULL
')->fetch(PDO::FETCH_ASSOC);

if ($attendance_rate['total_with_attendance'] > 0) {
    $attendance_rate['present_percentage'] = round(
        ($attendance_rate['present'] / $attendance_rate['total_with_attendance']) * 100,
        2
    );
} else {
    $attendance_rate['present_percentage'] = 0;
}

$stats['attendance'] = $attendance_rate;

// Most active courses
$active_courses = $pdo->query('
    SELECT
        c.id,
        c.code,
        c.title,
        COUNT(qe.id) as queue_entries
    FROM courses c
    LEFT JOIN queue_entries qe ON c.id = qe.course_id
    GROUP BY c.id, c.code, c.title
    ORDER BY queue_entries DESC
    LIMIT 10
')->fetchAll(PDO::FETCH_ASSOC);

$stats['active_courses'] = $active_courses;

// Peak usage times (hour of day)
$peak_times = $pdo->query('
    SELECT
        HOUR(joined_at) as hour,
        COUNT(*) as count
    FROM queue_entries
    WHERE joined_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY HOUR(joined_at)
    ORDER BY hour
')->fetchAll(PDO::FETCH_ASSOC);

$stats['peak_times'] = $peak_times;

// Day of week distribution
$day_distribution = $pdo->query('
    SELECT
        DAYNAME(joined_at) as day_name,
        DAYOFWEEK(joined_at) as day_num,
        COUNT(*) as count
    FROM queue_entries
    WHERE joined_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY DAYNAME(joined_at), DAYOFWEEK(joined_at)
    ORDER BY day_num
')->fetchAll(PDO::FETCH_ASSOC);

$stats['day_distribution'] = $day_distribution;

echo json_encode($stats);
