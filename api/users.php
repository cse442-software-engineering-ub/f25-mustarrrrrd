<?php
require __DIR__.'/db.php';

try {
  $stmt = pdo()->query('SELECT id, name, email, created_at FROM users ORDER BY id DESC');
  echo json_encode($stmt->fetchAll());
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error' => 'server error']);
}
