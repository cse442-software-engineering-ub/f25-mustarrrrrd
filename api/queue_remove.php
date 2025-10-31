<?php
declare(strict_types=1);

require_once __DIR__ . '/_shared.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db.php';

json_headers();
sess_start();

$u = current_user();
if (!$u) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'not_logged_in']); exit; }

try {
  $pdo = pdo();
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>'db_connect']);
  exit;
}

$in = json_decode(file_get_contents('php://input'), true) ?: [];
$user_email = trim((string)($in['user_email'] ?? ''));
$session_id = isset($in['session_id']) && ctype_digit((string)$in['session_id']) ? (int)$in['session_id'] : null;
$course_id  = $in['course_id'] ?? null; // not required, but tolerated

if ($user_email === '' || (!$session_id && !$course_id)) {
  http_response_code(400);
  echo json_encode(['ok'=>false,'error'=>'missing_params']);
  exit;
}

try {
  // 1) Fetch the entry BEFORE deleting so we can see attendance
  if ($session_id) {
    $sel = $pdo->prepare(
      "SELECT id, attendance, user_email
         FROM queue_entries
        WHERE user_email = ? AND session_id = ?
        ORDER BY id DESC
        LIMIT 1"
    );
    $sel->execute([$user_email, $session_id]);
  } else {
    // fallback by user + course (if that’s how you call it elsewhere)
    $sel = $pdo->prepare(
      "SELECT id, attendance, user_email
         FROM queue_entries
        WHERE user_email = ? AND course_id = ?
        ORDER BY id DESC
        LIMIT 1"
    );
    $sel->execute([$user_email, $course_id]);
  }

  $row = $sel->fetch(PDO::FETCH_ASSOC);

  // 2) Delete the entry
  if ($session_id) {
    $del = $pdo->prepare("DELETE FROM queue_entries WHERE user_email = ? AND session_id = ?");
    $del->execute([$user_email, $session_id]);
  } else {
    $del = $pdo->prepare("DELETE FROM queue_entries WHERE user_email = ? AND course_id = ?");
    $del->execute([$user_email, $course_id]);
  }

  $removed = (int)$del->rowCount();

  // 3) If they had been marked ABSENT, record a user notification
  if ($removed > 0 && $row && isset($row['attendance'])) {
    $att = strtolower((string)$row['attendance']);
    if ($att === 'absent') {
      // Table: user_notifications(id, user_email, notif_type, message, created_at, seen)
      $msg = "Remember to leave the queue if you can’t make it to the office hour.";
      $ins = $pdo->prepare(
        "INSERT INTO user_notifications (user_email, notif_type, message, created_at, seen)
              VALUES (?, 'absent_removed', ?, NOW(), 0)"
      );
      $ins->execute([$user_email, $msg]);
    }
  }

  echo json_encode(['ok'=>true, 'removed'=>$removed]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false, 'error'=>'remove_failed', 'detail'=>$e->getMessage()]);
}
