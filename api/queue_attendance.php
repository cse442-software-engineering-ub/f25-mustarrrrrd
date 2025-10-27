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
  $sessionId = isset($body['session_id']) && ctype_digit((string)$body['session_id']) ? (int)$body['session_id'] : null;
  $userEmail = $body['user_email'] ?? null;
  $status    = isset($body['status']) ? strtolower((string)$body['status']) : null; // "present" or "absent"

  if (!$courseKey && !$sessionId) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'missing_course_id_or_session_id']); exit; }
  if (!$userEmail)  { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'missing_user_email']); exit; }
  if (!$status || !in_array($status, ['present','absent'], true)) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'invalid_status']); exit; }

  $course_id = null;
  if ($courseKey) {
    $course_id = canonical_course_id($pdo, $courseKey);
  }

  // Ensure attendance column exists (backwards compatible: add if missing)
  try {
    $pdo->query('SELECT attendance FROM queue_entries LIMIT 1');
  } catch (Throwable $e) {
    // Try to add the column
    $pdo->exec("ALTER TABLE queue_entries ADD COLUMN attendance ENUM('present','absent') NULL");
  }

  if ($sessionId) {
    // session-specific attendance
    $upd = $pdo->prepare('UPDATE queue_entries SET attendance = ? WHERE session_id = ? AND user_email = ? AND left_at IS NULL');
    $upd->execute([$status, $sessionId, $userEmail]);
  } else {
    $upd = $pdo->prepare('UPDATE queue_entries SET attendance = ? WHERE course_id = ? AND user_email = ? AND left_at IS NULL');
    $upd->execute([$status, $course_id, $userEmail]);
  }

  out(200, ['ok'=>true, 'updated'=>$upd->rowCount()]);
} catch (Throwable $e) {
  out(500, ['ok'=>false,'error'=>$e->getMessage()]);
}
