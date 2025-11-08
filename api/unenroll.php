<?php
require_once __DIR__ . '/_shared.php';
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');
set_cors_headers();
sess_start();

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
        // Unenroll from a course
        if (!isset($input['course_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'course_id is required']);
            exit;
        }

        $course_id = $input['course_id'];

        // Check if course is favorited
        $stmt = $pdo->prepare("SELECT * FROM favorites WHERE user_id = ? AND course_id = ?");
        $stmt->execute([$user_id, $course_id]);
        $is_favorited = $stmt->fetch();

        // Begin transaction to ensure both operations succeed or fail together
        $pdo->beginTransaction();

        try {
            // Remove from favorites if it was favorited
            if ($is_favorited) {
                $stmt = $pdo->prepare("DELETE FROM favorites WHERE user_id = ? AND course_id = ?");
                $stmt->execute([$user_id, $course_id]);
            }

            // Remove from enrollments
            $stmt = $pdo->prepare("DELETE FROM enrollments WHERE user_id = ? AND course_id = ?");
            $stmt->execute([$user_id, $course_id]);

            // Commit transaction
            $pdo->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Successfully unenrolled',
                'removed_from_favorites' => $is_favorited ? true : false
            ]);

        } catch (Exception $e) {
            // Rollback transaction on error
            $pdo->rollBack();
            throw $e;
        }

    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }

} catch (PDOException $e) {
    error_log('Unenroll error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}
