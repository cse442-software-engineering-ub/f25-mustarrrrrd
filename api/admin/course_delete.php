<?php
// admin/course_delete.php — Delete a course
require_once __DIR__ . '/../_shared.php';
require_once __DIR__ . '/../admin_auth.php';
set_cors_headers();
sess_start();


$admin = require_admin();
$pdo = pdo();

$data = read_json();
$course_id = (int) ($data['id'] ?? 0);

if (!$course_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Course ID required']);
    exit;
}

// Check if course exists
$check_stmt = $pdo->prepare('SELECT id, code, title FROM courses WHERE id = ? LIMIT 1');
$check_stmt->execute([$course_id]);
$course = $check_stmt->fetch(PDO::FETCH_ASSOC);

if (!$course) {
    http_response_code(404);
    echo json_encode(['error' => 'Course not found']);
    exit;
}

// Log the action before deletion
try {
    log_admin_action(
        $pdo,
        (int) $admin['id'],
        'delete_course',
        'course',
        $course_id,
        [
            'code' => $course['code'],
            'title' => $course['title']
        ]
    );
} catch (Exception $e) {
    // Continue even if logging fails
    error_log("Audit log failed: " . $e->getMessage());
}

// Delete course (cascades to enrollments, sessions, queue_entries, etc.)
$stmt = $pdo->prepare('DELETE FROM courses WHERE id = ?');
$stmt->execute([$course_id]);

echo json_encode([
    'success' => true,
    'message' => 'Course deleted successfully'
]);
