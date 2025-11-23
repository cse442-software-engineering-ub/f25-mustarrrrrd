<?php
// admin/user_get.php — Get detailed user information
require_once __DIR__ . '/../_shared.php';
require_once __DIR__ . '/../admin_auth.php';
set_cors_headers();
sess_start();


$admin = require_admin();
$pdo = pdo();

$user_id = (int)($_GET['id'] ?? 0);

if (!$user_id) {
    http_response_code(400);
    echo json_encode(['error' => 'User ID required']);
    exit;
}

// Get user details
$stmt = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
$stmt->execute([$user_id]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found']);
    exit;
}

// Remove sensitive data
unset($user['password_hash'], $user['session_token']);

// Get enrollments
$enrollment_stmt = $pdo->prepare('
    SELECT
        e.course_id,
        e.role_in_course,
        c.code,
        c.title,
        c.lecture_times,
        c.room
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    WHERE e.user_id = ?
    ORDER BY c.code
');
$enrollment_stmt->execute([$user_id]);
$user['enrollments'] = $enrollment_stmt->fetchAll(PDO::FETCH_ASSOC);

// Get queue history stats
$queue_stats_stmt = $pdo->prepare('
    SELECT
        COUNT(*) as total_sessions,
        SUM(CASE WHEN attendance = "present" THEN 1 ELSE 0 END) as attended,
        SUM(CASE WHEN attendance = "absent" THEN 1 ELSE 0 END) as missed,
        AVG(TIMESTAMPDIFF(MINUTE, joined_at, left_at)) as avg_wait_minutes
    FROM queue_entries
    WHERE user_email = ? AND left_at IS NOT NULL
');
$queue_stats_stmt->execute([$user['email']]);
$user['queue_stats'] = $queue_stats_stmt->fetch(PDO::FETCH_ASSOC);

// Get office hours sessions if TA or professor
if (in_array($user['role'], ['ta', 'professor', 'admin'])) {
    $sessions_stmt = $pdo->prepare('
        SELECT
            ohs.id,
            ohs.course_id,
            ohs.day_of_week,
            ohs.start_time,
            ohs.end_time,
            ohs.location,
            c.code as course_code,
            c.title as course_title
        FROM office_hours_sessions ohs
        JOIN courses c ON ohs.course_id = c.id
        WHERE ohs.instructor_id = ?
        ORDER BY
            FIELD(ohs.day_of_week, "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"),
            ohs.start_time
    ');
    $sessions_stmt->execute([$user_id]);
    $user['office_hours_sessions'] = $sessions_stmt->fetchAll(PDO::FETCH_ASSOC);
}

echo json_encode($user);
