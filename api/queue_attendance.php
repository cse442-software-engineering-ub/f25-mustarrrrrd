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
  $status    = isset($body['status']) ? strtolower((string)$body['status']) : null; // "present" | "absent"

  if (!$courseKey && !$sessionId) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'missing_course_id_or_session_id']); exit; }
  if (!$userEmail)  { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'missing_user_email']); exit; }
  if (!$status || !in_array($status, ['present','absent'], true)) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'invalid_status']); exit; }

  $course_id = null;
  if ($courseKey) {
    $course_id = canonical_course_id($pdo, $courseKey);
  }

  if ($sessionId) {
    $upd = $pdo->prepare('UPDATE queue_entries SET attendance = ? WHERE session_id = ? AND user_email = ? AND left_at IS NULL');
    $upd->execute([$status, $sessionId, $userEmail]);
  } else {
    $upd = $pdo->prepare('UPDATE queue_entries SET attendance = ? WHERE course_id = ? AND user_email = ? AND left_at IS NULL');
    $upd->execute([$status, $course_id, $userEmail]);
  }

  // If they were marked absent, record a notification for the student.
  if ($upd->rowCount() > 0 && $status === 'absent') {
    $msg = "You were marked absent. Please remember to either leave the queue or wait until your turn.";

    // Prefer existing 'notifications' table, else fallback to 'user_notifications'
    $targetTable = 'notifications';
    try { $pdo->query("SELECT 1 FROM {$targetTable} LIMIT 1"); }
    catch (Throwable $e) { $targetTable = 'user_notifications'; }

    // Validate table name against allowlist
    $targetTable = validate_table_name($targetTable, ['notifications', 'user_notifications']);

    if ($targetTable === 'notifications') {
      // expected columns: id, user_email, notif_type, message, created_at, seen
      $ins = $pdo->prepare('INSERT INTO notifications (user_email, notif_type, message, seen) VALUES (?, ?, ?, 0)');
      $ins->execute([$userEmail, 'absent_removed', $msg]);
    } else {
      $ins = $pdo->prepare('INSERT INTO user_notifications (user_email, notif_type, message, seen) VALUES (?, ?, ?, 0)');
      $ins->execute([$userEmail, 'absent_removed', $msg]);
    }
  }

  out(200, ['ok'=>true, 'updated'=>$upd->rowCount()]);
} catch (Throwable $e) {
  error_log('Queue attendance error: ' . $e->getMessage());
  out(500, ['ok'=>false,'error'=>'Server error']);
}