<?php
// admin/course_get.php — Get detailed course information
require_once __DIR__ . '/../_shared.php';
require_once __DIR__ . '/../admin_auth.php';
set_cors_headers();
sess_start();


$admin = require_admin();
$pdo = pdo();

$course_id = (int)($_GET['id'] ?? 0);

if (!$course_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Course ID required']);
    exit;
}

// Get course details
$stmt = $pdo->prepare('SELECT * FROM courses WHERE id = ? LIMIT 1');
$stmt->execute([$course_id]);
$course = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$course) {
    http_response_code(404);
    echo json_encode(['error' => 'Course not found']);
    exit;
}

// Get enrollments by role
$enrollment_stmt = $pdo->prepare('
    SELECT
        e.role_in_course,
        u.id,
        u.name,
        u.preferred_name,
        u.email,
        u.pronouns
    FROM enrollments e
    JOIN users u ON e.user_id = u.id
    WHERE e.course_id = ?
    ORDER BY e.role_in_course, u.name
');
$enrollment_stmt->execute([$course_id]);
$enrollments = $enrollment_stmt->fetchAll(PDO::FETCH_ASSOC);

$course['students'] = [];
$course['tas'] = [];
$course['professors'] = [];

foreach ($enrollments as $e) {
    $user_info = [
        'id' => $e['id'],
        'name' => $e['name'],
        'preferred_name' => $e['preferred_name'],
        'email' => $e['email'],
        'pronouns' => $e['pronouns']
    ];

    if ($e['role_in_course'] === 'student') {
        $course['students'][] = $user_info;
    } elseif ($e['role_in_course'] === 'ta') {
        $course['tas'][] = $user_info;
    } elseif ($e['role_in_course'] === 'professor') {
        $course['professors'][] = $user_info;
    }
}

// Get office hours sessions
$sessions_stmt = $pdo->prepare('
    SELECT
        ohs.*,
        u.name as instructor_name,
        u.email as instructor_email
    FROM office_hours_sessions ohs
    JOIN users u ON ohs.instructor_id = u.id
    WHERE ohs.course_id = ?
    ORDER BY
        FIELD(ohs.day_of_week, "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"),
        ohs.start_time
');
$sessions_stmt->execute([$course_id]);
$course['office_hours_sessions'] = $sessions_stmt->fetchAll(PDO::FETCH_ASSOC);

// Get queue statistics
$queue_stats_stmt = $pdo->prepare('
    SELECT
        COUNT(*) as total_entries,
        COUNT(CASE WHEN left_at IS NULL THEN 1 END) as active_entries,
        COUNT(CASE WHEN attendance = "present" THEN 1 END) as present_count,
        COUNT(CASE WHEN attendance = "absent" THEN 1 END) as absent_count,
        AVG(CASE WHEN left_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, joined_at, left_at) END) as avg_wait_minutes
    FROM queue_entries
    WHERE course_id = ?
');
$queue_stats_stmt->execute([$course_id]);
$course['queue_stats'] = $queue_stats_stmt->fetch(PDO::FETCH_ASSOC);

echo json_encode($course);
