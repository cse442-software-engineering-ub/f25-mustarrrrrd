<?php
require __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];

    $code          = clamp191($data['code'] ?? '');
    $name          = clamp191($data['name'] ?? '');
    $lectureTimes  = clamp191($data['lectureTimes'] ?? '');
    $room          = clamp191($data['room'] ?? '');
    $userEmail     = clamp191($data['userEmail'] ?? '');

    // ✅ Validation
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
    if ($userEmail === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'User email missing']);
        exit;
    }

    $pdo = pdo();

    // ✅ Look up the user’s name from the users table
    $stmtUser = $pdo->prepare('SELECT name FROM users WHERE email = ? LIMIT 1');
    $stmtUser->execute([$userEmail]);
    $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'No user found for that email']);
        exit;
    }

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
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
