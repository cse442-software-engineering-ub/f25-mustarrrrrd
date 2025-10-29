<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

header('Content-Type: application/json');

// CORS (reflect origin; allow credentials)
if (isset($_SERVER['HTTP_ORIGIN'])) {
  header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
  header('Access-Control-Allow-Credentials: true');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  exit;
}

// Read JSON input
$in = read_json();
$user_email = trim($in['user_email'] ?? '');
$session_id = trim($in['session_id'] ?? '');

// Validate input
if (!$user_email) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'message' => 'Missing user_email']);
  exit;
}

try {
  $pdo = pdo(); // ✅ Correct PDO connection
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'message' => 'Database connection error']);
  exit;
}

try {
  if ($session_id) {
    $stmt = $pdo->prepare('DELETE FROM queue_entries WHERE user_email = ? AND session_id = ?');
    $stmt->execute([$user_email, $session_id]);
  } else {
    $stmt = $pdo->prepare('DELETE FROM queue_entries WHERE user_email = ?');
    $stmt->execute([$user_email]);
  }

  if ($stmt->rowCount() > 0) {
    echo json_encode(['ok' => true, 'message' => 'Student removed from queue']);
  } else {
    echo json_encode(['ok' => false, 'message' => 'No matching student found']);
  }
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'message' => 'Error removing student', 'error' => $e->getMessage()]);
}
