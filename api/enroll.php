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

// Parse request
$method = $_SERVER['REQUEST_METHOD'];
$input = read_json();

try {
    $pdo = pdo();

    if ($method === 'POST') {
        // Enroll in a course
        if (!isset($input['course_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'course_id is required']);
            exit;
        }

        $course_id = $input['course_id'];
        $role = isset($input['role']) ? $input['role'] : 'student'; // Default to student

        // Validate role
        if (!in_array($role, ['student', 'ta', 'professor'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid role']);
            exit;
        }

        // Check if course exists
        $courseStmt = $pdo->prepare("SELECT * FROM courses WHERE id = ?");
        $courseStmt->execute([$course_id]);
        if (!$courseStmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Course not found']);
            exit;
        }

        // Check if already enrolled
        $stmt = $pdo->prepare("SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?");
        $stmt->execute([$user_id, $course_id]);

        if ($stmt->fetch()) {
            echo json_encode(['success' => true, 'message' => 'Already enrolled']);
            exit;
        }

        // Enroll user in course
        $stmt = $pdo->prepare("INSERT INTO enrollments (user_id, course_id, role_in_course) VALUES (?, ?, ?)");
        $stmt->execute([$user_id, $course_id, $role]);

        echo json_encode(['success' => true, 'message' => 'Successfully enrolled']);

    } elseif ($method === 'DELETE') {
        // Leave a course
        if (!isset($input['course_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'course_id is required']);
            exit;
        }

        $course_id = $input['course_id'];

        $stmt = $pdo->prepare("DELETE FROM enrollments WHERE user_id = ? AND course_id = ?");
        $stmt->execute([$user_id, $course_id]);

        echo json_encode(['success' => true, 'message' => 'Left course']);

    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
