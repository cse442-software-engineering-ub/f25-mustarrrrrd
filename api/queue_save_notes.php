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

  $body      = json_decode(file_get_contents('php://input'), true) ?: [];
  $courseKey = $body['course_id'] ?? $body['course_code'] ?? null;
  $notes     = isset($body['notes']) ? clamp191((string)$body['notes']) : '';
  $sessionId = isset($body['session_id']) && ctype_digit((string)$body['session_id']) ? (int)$body['session_id'] : null;

  if (!$courseKey && !$sessionId) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'missing_course_id_or_session_id']); exit; }

  $course_id = null;
  if ($courseKey) {
    $course_id = canonical_course_id($pdo, $courseKey);
  }

  // Update notes for the currently active queue row for this user (optionally session-specific)
  if ($sessionId) {
    $upd = $pdo->prepare(
      'UPDATE queue_entries
         SET notes = ?
       WHERE session_id = ? AND user_email = ? AND left_at IS NULL'
    );
    $upd->execute([$notes, $sessionId, $u['email'] ?? '']);
  } else {
    $upd = $pdo->prepare(
      'UPDATE queue_entries
         SET notes = ?
       WHERE course_id = ? AND user_email = ? AND left_at IS NULL'
    );
    $upd->execute([$notes, $course_id, $u['email'] ?? '']);
  }

  echo json_encode(['ok'=>true, 'updated'=>$upd->rowCount()]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>'server_error','detail'=>$e->getMessage()]);
}
