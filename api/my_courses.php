<?php
session_start();
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

$user_id = $_SESSION['user_id'];

try {
    $pdo = pdo();

    // Get all courses the user is enrolled in along with favorite status
    $stmt = $pdo->prepare("
        SELECT
            c.id,
            c.code,
            c.title,
            c.lecture_times,
            c.room,
            e.role_in_course,
            CASE WHEN f.course_id IS NOT NULL THEN 1 ELSE 0 END as is_favorited
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN favorites f ON f.course_id = c.id AND f.user_id = ?
        WHERE e.user_id = ?
    ");
    $stmt->execute([$user_id, $user_id]);
    $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['courses' => $courses]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
