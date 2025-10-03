<?php
require __DIR__.'/db.php';

header('Content-Type: application/json; charset=utf-8');

try {
  $data  = json_decode(file_get_contents('php://input'), true) ?? [];
  $code  = clamp191($data['code']  ?? '');
  $credits = clamp191($data['credits'] ?? '');
  $name = clamp191($data['name'] ?? '');
  $description = clamp191($data['description'] ?? '');
  $lectureTimes = clamp191($data['lectureTimes'] ?? '');

  if ($code === '') {
    http_response_code(400);
    echo json_encode(['match' => false, 'message' => 'code required']);
    exit;
  }
  if ($credits === '') {
    http_response_code(400);
    echo json_encode(['match' => false, 'message' => 'credits required']);
    exit;
  }
  if ($name === '') {
    http_response_code(400);
    echo json_encode(['match' => false, 'message' => 'name required']);
    exit;
  }
  if ($description === '') {
    http_response_code(400);
    echo json_encode(['match' => false, 'message' => 'description required']);
    exit;
  }
  if ($lectureTimes === '') {
    http_response_code(400);
    echo json_encode(['match' => false, 'message' => 'lecture times required']);
    exit;
  }

  $stmt = pdo()->prepare('INSERT INTO courses (code, title, term, year) VALUES (?, ?, ?, ?)');
  $stmt->execute([$code, $name, 'Fall', 2025]);

  echo json_encode([
        "success" => true,
        "message" => "Course created successfully"
    ]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['match' => false, 'message' => 'server error']);
}
