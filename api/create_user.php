<?php
require __DIR__.'/db.php';

try {
  $data = read_json();
  $name  = clamp191($data['name']  ?? '');
  $email = clamp191($data['email'] ?? '');

  if ($name === '' || $email === '') {
    http_response_code(400);
    echo json_encode(['error' => 'name and email required']); exit;
  }
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid email']); exit;
  }

  $stmt = pdo()->prepare('INSERT INTO users (name, email) VALUES (?, ?)');
  $stmt->execute([$name, $email]);

  echo json_encode(['ok' => true]);
} catch (PDOException $e) {
  if ((int)$e->getCode() === 23000) { // duplicate
    http_response_code(409);
    echo json_encode(['error' => 'email already exists']); exit;
  }
  http_response_code(500);
  echo json_encode(['error' => 'server error']);
}
