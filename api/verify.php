<?php
require __DIR__.'/db.php';

header('Content-Type: application/json; charset=utf-8');

try {
  $data  = json_decode(file_get_contents('php://input'), true) ?? [];
  $name  = clamp191($data['name']  ?? '');
  $email = clamp191($data['email'] ?? '');

  if ($name === '' || $email === '') {
    http_response_code(400);
    echo json_encode(['match' => false, 'message' => 'name and email required']);
    exit;
  }

  
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['match' => false, 'message' => 'invalid email']);
    exit;
  }

  $stmt = pdo()->prepare('SELECT id, name FROM users WHERE email = ? AND name = ? LIMIT 1');
  $stmt->execute([$email, $name]);
  $row = $stmt->fetch();

  if ($row) {
    echo json_encode(['match' => true, 'message' => "Welcome {$row['name']}"]);
  } else {
    echo json_encode(['match' => false, 'message' => 'No match']);
  }
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['match' => false, 'message' => 'server error']);
}
