<?php
declare(strict_types=1);
require_once __DIR__ . '/_shared.php';
require_once __DIR__ . '/auth.php';

json_headers();
sess_start();

$u = current_user();
if (!$u) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'not_logged_in']); exit; }

try {
  $pdo = pdo_or_die();
  $in = json_decode(file_get_contents('php://input'), true) ?: [];
  $sessionId = isset($in['session_id']) && ctype_digit((string)$in['session_id']) ? (int)$in['session_id'] : null;
  if (!$sessionId) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'missing_session_id']); exit; }

  $stmt = $pdo->prepare('SELECT * FROM office_hours_sessions WHERE id = ? LIMIT 1');
  $stmt->execute([$sessionId]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$row) { http_response_code(404); echo json_encode(['ok'=>false,'error'=>'not_found']); exit; }

  $isAllowed = false;
  $uid = isset($u['id']) ? (int)$u['id'] : 0;
  if ($row['instructor_id'] && (int)$row['instructor_id'] === $uid) {
    $isAllowed = true;
  } else {
    $q = $pdo->prepare('SELECT 1 FROM enrollments WHERE course_id = ? AND user_id = ? AND role_in_course IN ("professor", "ta") LIMIT 1');
    $q->execute([(int)$row['course_id'], $uid]);
    if ($q->fetchColumn()) $isAllowed = true;
  }

  if (!$isAllowed) { http_response_code(403); echo json_encode(['ok'=>false,'error'=>'forbidden']); exit; }

  $del = $pdo->prepare('DELETE FROM office_hours_sessions WHERE id = ?');
  $del->execute([$sessionId]);

  echo json_encode(['ok'=>true, 'deleted' => $del->rowCount()]);
} catch (Throwable $e) {
  error_log('Delete office hours session error: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>'Server error']);
}
