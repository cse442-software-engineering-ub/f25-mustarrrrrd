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

    if ($method === 'GET') {
        // Get all favorites for the user with course details
        $stmt = $pdo->prepare("
            SELECT c.id, c.code, c.title, c.lecture_times, c.room
            FROM favorites f
            JOIN courses c ON f.course_id = c.id
            WHERE f.user_id = ?
        ");
        $stmt->execute([$user_id]);
        $favorites = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['favorites' => $favorites]);

    } elseif ($method === 'POST') {
        // Add a favorite
        if (!isset($input['course_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'course_id is required']);
            exit;
        }

        $course_id = $input['course_id'];

        // Check if already favorited
        $stmt = $pdo->prepare("SELECT * FROM favorites WHERE user_id = ? AND course_id = ?");
        $stmt->execute([$user_id, $course_id]);

        if ($stmt->fetch()) {
            echo json_encode(['success' => true, 'message' => 'Already favorited']);
            exit;
        }

        // Add favorite
        $stmt = $pdo->prepare("INSERT INTO favorites (user_id, course_id) VALUES (?, ?)");
        $stmt->execute([$user_id, $course_id]);

        echo json_encode(['success' => true, 'message' => 'Favorite added']);

    } elseif ($method === 'DELETE') {
        // Remove a favorite
        if (!isset($input['course_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'course_id is required']);
            exit;
        }

        $course_id = $input['course_id'];

        $stmt = $pdo->prepare("DELETE FROM favorites WHERE user_id = ? AND course_id = ?");
        $stmt->execute([$user_id, $course_id]);

        echo json_encode(['success' => true, 'message' => 'Favorite removed']);

    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }

} catch (PDOException $e) {
    error_log('Favorites error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}
