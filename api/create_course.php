<?php
require __DIR__ . '/db.php';
require __DIR__ . '/auth.php';

header('Content-Type: application/json; charset=utf-8');

// Authentication required
$u = current_user();
if (!$u) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];

    $code          = clamp191($data['code'] ?? '');
    $name          = clamp191($data['name'] ?? '');
    $lectureTimes  = clamp191($data['lectureTimes'] ?? '');
    $room          = clamp191($data['room'] ?? '');

    // Use authenticated user's email instead of accepting from request
    $userEmail = $u['email'];

    // Validation
    if ($code === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Course code required']);
        exit;
    }
    if ($name === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Course name required']);
        exit;
    }
    if ($lectureTimes === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Lecture times required']);
        exit;
    }
    if ($room === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Room required']);
        exit;
    }

    $pdo = pdo();

    // Insert course info
    $stmt = $pdo->prepare('
        INSERT INTO courses (code, title, lecture_times, room)
        VALUES (?, ?, ?, ?)
    ');
    $stmt->execute([$code, $name, $lectureTimes, $room]);

    echo json_encode([
        'success' => true,
        'message' => 'Course created successfully'
    ]);
} catch (Throwable $e) {
    error_log('Create course error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error'
    ]);
}
