<?php
// admin/analytics_users.php — Detailed user analytics
require_once __DIR__ . '/../_shared.php';
require_once __DIR__ . '/../admin_auth.php';
set_cors_headers();
sess_start();


$admin = require_admin();
$pdo = pdo();

$analytics = [];

// Role distribution
$role_dist = $pdo->query('
    SELECT role, COUNT(*) as count
    FROM users
    WHERE is_active = 1
    GROUP BY role
')->fetchAll(PDO::FETCH_ASSOC);

$analytics['role_distribution'] = $role_dist;

// Academic year distribution (students only)
$year_dist = $pdo->query('
    SELECT
        academic_year,
        COUNT(*) as count
    FROM users
    WHERE role = "student" AND academic_year IS NOT NULL AND is_active = 1
    GROUP BY academic_year
    ORDER BY FIELD(academic_year, "Freshman", "Sophomore", "Junior", "Senior")
')->fetchAll(PDO::FETCH_ASSOC);

$analytics['academic_year_distribution'] = $year_dist;

// Major distribution (top 10)
$major_dist = $pdo->query('
    SELECT
        major,
        COUNT(*) as count
    FROM users
    WHERE major IS NOT NULL AND is_active = 1
    GROUP BY major
    ORDER BY count DESC
    LIMIT 10
')->fetchAll(PDO::FETCH_ASSOC);

$analytics['top_majors'] = $major_dist;

// Profile completion rate
$profile_completion = $pdo->query('
    SELECT
        COUNT(*) as total_users,
        COUNT(preferred_name) as has_preferred_name,
        COUNT(pronouns) as has_pronouns,
        COUNT(academic_year) as has_academic_year,
        COUNT(major) as has_major
    FROM users
    WHERE is_active = 1
')->fetch(PDO::FETCH_ASSOC);

if ($profile_completion['total_users'] > 0) {
    $profile_completion['completion_rate'] = round(
        (($profile_completion['has_preferred_name'] +
          $profile_completion['has_pronouns'] +
          $profile_completion['has_academic_year'] +
          $profile_completion['has_major']) / ($profile_completion['total_users'] * 4)) * 100,
        2
    );
} else {
    $profile_completion['completion_rate'] = 0;
}

$analytics['profile_completion'] = $profile_completion;

// Most active students (by queue entries)
$active_students = $pdo->query('
    SELECT
        u.id,
        u.name,
        u.email,
        COUNT(qe.id) as queue_entries,
        COUNT(CASE WHEN qe.attendance = "present" THEN 1 END) as attended,
        COUNT(CASE WHEN qe.attendance = "absent" THEN 1 END) as missed
    FROM users u
    JOIN queue_entries qe ON u.email = qe.user_email
    WHERE u.role = "student"
    GROUP BY u.id, u.name, u.email
    ORDER BY queue_entries DESC
    LIMIT 10
')->fetchAll(PDO::FETCH_ASSOC);

$analytics['most_active_students'] = $active_students;

// Inactive users (never joined a queue)
$inactive_count = $pdo->query('
    SELECT COUNT(*) as count
    FROM users u
    LEFT JOIN queue_entries qe ON u.email = qe.user_email
    WHERE u.role = "student" AND u.is_active = 1 AND qe.id IS NULL
')->fetch(PDO::FETCH_ASSOC);

$analytics['inactive_students_count'] = $inactive_count['count'];

// User registrations by month (last 12 months)
$monthly_registrations = $pdo->query('
    SELECT
        DATE_FORMAT(created_at, "%Y-%m") as month,
        COUNT(*) as count,
        COUNT(CASE WHEN role = "student" THEN 1 END) as students,
        COUNT(CASE WHEN role = "ta" THEN 1 END) as tas,
        COUNT(CASE WHEN role = "professor" THEN 1 END) as professors
    FROM users
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
    GROUP BY DATE_FORMAT(created_at, "%Y-%m")
    ORDER BY month
')->fetchAll(PDO::FETCH_ASSOC);

$analytics['monthly_registrations'] = $monthly_registrations;

echo json_encode($analytics);
