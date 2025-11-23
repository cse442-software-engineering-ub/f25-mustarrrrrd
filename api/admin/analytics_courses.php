<?php
// admin/analytics_courses.php — Detailed course analytics
require_once __DIR__ . '/../_shared.php';
require_once __DIR__ . '/../admin_auth.php';
set_cors_headers();
sess_start();


$admin = require_admin();
$pdo = pdo();

$analytics = [];

// Course enrollment statistics
$enrollment_stats = $pdo->query('
    SELECT
        c.id,
        c.code,
        c.title,
        COUNT(DISTINCT CASE WHEN e.role_in_course = "student" THEN e.user_id END) as student_count,
        COUNT(DISTINCT CASE WHEN e.role_in_course = "ta" THEN e.user_id END) as ta_count,
        COUNT(DISTINCT CASE WHEN e.role_in_course = "professor" THEN e.user_id END) as professor_count,
        COUNT(DISTINCT ohs.id) as session_count,
        COUNT(DISTINCT qe.id) as total_queue_entries
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id
    LEFT JOIN office_hours_sessions ohs ON c.id = ohs.course_id
    LEFT JOIN queue_entries qe ON c.id = qe.course_id
    GROUP BY c.id, c.code, c.title
    ORDER BY student_count DESC
')->fetchAll(PDO::FETCH_ASSOC);

$analytics['course_enrollment_stats'] = $enrollment_stats;

// Courses needing TAs (high student:TA ratio)
$needs_tas = $pdo->query('
    SELECT
        c.id,
        c.code,
        c.title,
        COUNT(DISTINCT CASE WHEN e.role_in_course = "student" THEN e.user_id END) as student_count,
        COUNT(DISTINCT CASE WHEN e.role_in_course = "ta" THEN e.user_id END) as ta_count
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id
    GROUP BY c.id, c.code, c.title
    HAVING student_count > 0 AND (ta_count = 0 OR (student_count / GREATEST(ta_count, 1)) > 20)
    ORDER BY student_count DESC
')->fetchAll(PDO::FETCH_ASSOC);

$analytics['courses_needing_tas'] = $needs_tas;

// Courses without office hours
$no_office_hours = $pdo->query('
    SELECT
        c.id,
        c.code,
        c.title,
        COUNT(DISTINCT e.user_id) as enrolled_count
    FROM courses c
    LEFT JOIN office_hours_sessions ohs ON c.id = ohs.course_id
    LEFT JOIN enrollments e ON c.id = e.course_id
    WHERE ohs.id IS NULL
    GROUP BY c.id, c.code, c.title
    HAVING enrolled_count > 0
    ORDER BY enrolled_count DESC
')->fetchAll(PDO::FETCH_ASSOC);

$analytics['courses_without_office_hours'] = $no_office_hours;

// Most popular courses (by queue activity)
$popular_courses = $pdo->query('
    SELECT
        c.id,
        c.code,
        c.title,
        COUNT(qe.id) as total_queue_entries,
        COUNT(DISTINCT qe.user_email) as unique_students,
        AVG(CASE WHEN qe.left_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, qe.joined_at, qe.left_at) END) as avg_wait_minutes
    FROM courses c
    LEFT JOIN queue_entries qe ON c.id = qe.course_id
    GROUP BY c.id, c.code, c.title
    HAVING total_queue_entries > 0
    ORDER BY total_queue_entries DESC
    LIMIT 10
')->fetchAll(PDO::FETCH_ASSOC);

$analytics['most_popular_courses'] = $popular_courses;

// Office hours coverage by day
$coverage_by_day = $pdo->query('
    SELECT
        day_of_week,
        COUNT(*) as session_count,
        COUNT(DISTINCT course_id) as courses_with_sessions
    FROM office_hours_sessions
    GROUP BY day_of_week
    ORDER BY FIELD(day_of_week, "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
')->fetchAll(PDO::FETCH_ASSOC);

$analytics['office_hours_coverage'] = $coverage_by_day;

// Average enrollment per course
$avg_enrollment = $pdo->query('
    SELECT
        AVG(student_count) as avg_students,
        AVG(ta_count) as avg_tas,
        AVG(professor_count) as avg_professors
    FROM (
        SELECT
            c.id,
            COUNT(CASE WHEN e.role_in_course = "student" THEN 1 END) as student_count,
            COUNT(CASE WHEN e.role_in_course = "ta" THEN 1 END) as ta_count,
            COUNT(CASE WHEN e.role_in_course = "professor" THEN 1 END) as professor_count
        FROM courses c
        LEFT JOIN enrollments e ON c.id = e.course_id
        GROUP BY c.id
    ) as course_stats
')->fetch(PDO::FETCH_ASSOC);

$analytics['average_enrollment'] = $avg_enrollment;

echo json_encode($analytics);
