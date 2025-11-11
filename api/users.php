<?php
require __DIR__.'/db.php';
require __DIR__.'/auth.php';

header('Content-Type: application/json');

// Authentication required
$u = current_user();
if (!$u) {
  http_response_code(401);
  echo json_encode(['error' => 'unauthorized']);
  exit;
}

try {
  $stmt = pdo()->query('SELECT id, name, email, created_at FROM users ORDER BY id DESC');
  echo json_encode($stmt->fetchAll());
} catch (Throwable $e) {
  error_log('Users list error: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['error' => 'server error']);
}
