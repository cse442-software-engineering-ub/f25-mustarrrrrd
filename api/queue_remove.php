<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

header('Content-Type: application/json');

// CORS (with whitelist validation)
set_cors_headers();
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  exit;
}

// Authentication required
$u = current_user();
if (!$u) {
  http_response_code(401);
  echo json_encode(['ok' => false, 'message' => 'Not logged in']);
  exit;
}

// Read JSON input
$in = read_json();
$user_email = trim($in['user_email'] ?? '');
$session_id = trim($in['session_id'] ?? '');

// If no user_email provided, use the authenticated user's email
if (!$user_email) {
  $user_email = $u['email'];
}

// Authorization: users can only remove themselves unless they're a professor for this session
if ($user_email !== $u['email']) {
  // Check if current user is a professor for this session
  if (!$session_id) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'message' => 'Cannot remove other users without session_id']);
    exit;
  }

  try {
    $pdo = pdo();
    $auth_check = $pdo->prepare('
      SELECT 1 FROM office_hours_sessions ohs
      JOIN enrollments e ON e.course_id = ohs.course_id
      WHERE ohs.id = ? AND e.user_id = ? AND e.role_in_course = "professor"
      LIMIT 1
    ');
    $auth_check->execute([$session_id, $u['id']]);

    if (!$auth_check->fetchColumn()) {
      http_response_code(403);
      echo json_encode(['ok' => false, 'message' => 'Not authorized to remove other users']);
      exit;
    }
  } catch (Throwable $e) {
    error_log('Queue remove auth check error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Server error']);
    exit;
  }
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
  error_log('Queue remove error: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['ok' => false, 'message' => 'Server error']);
}
