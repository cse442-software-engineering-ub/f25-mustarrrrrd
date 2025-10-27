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
  $body = json_decode(file_get_contents('php://input'), true) ?: [];
  $sessionId = isset($body['session_id']) && ctype_digit((string)$body['session_id']) ? (int)$body['session_id'] : null;
  $day = $body['day_of_week'] ?? null;
  $start = $body['start_time'] ?? null; // expected HH:MM
  $end = $body['end_time'] ?? null;
  $location = isset($body['location']) ? trim((string)$body['location']) : '';

  if (!$sessionId) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'missing_session_id']); exit; }

  // load session
  $stmt = $pdo->prepare('SELECT * FROM office_hours_sessions WHERE id = ? LIMIT 1');
  $stmt->execute([$sessionId]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$row) { http_response_code(404); echo json_encode(['ok'=>false,'error'=>'not_found']); exit; }

  $isAllowed = false;
  $uid = isset($u['id']) ? (int)$u['id'] : 0;
  if ($row['instructor_id'] && (int)$row['instructor_id'] === $uid) {
    $isAllowed = true;
  } else {
    // fallback: check enrollments for professor role on the course
    $q = $pdo->prepare('SELECT 1 FROM enrollments WHERE course_id = ? AND user_id = ? AND role_in_course = "professor" LIMIT 1');
    $q->execute([(int)$row['course_id'], $uid]);
    if ($q->fetchColumn()) $isAllowed = true;
  }

  if (!$isAllowed) { http_response_code(403); echo json_encode(['ok'=>false,'error'=>'forbidden']); exit; }

  // normalize times to HH:MM:SS if needed
  if ($start && strlen($start) === 5) $start .= ':00';
  if ($end && strlen($end) === 5) $end .= ':00';

  $upd = $pdo->prepare('UPDATE office_hours_sessions SET day_of_week = ?, start_time = ?, end_time = ?, location = ? WHERE id = ?');
  $upd->execute([$day, $start, $end, $location, $sessionId]);

  echo json_encode(['ok'=>true, 'updated'=>$upd->rowCount()]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}
