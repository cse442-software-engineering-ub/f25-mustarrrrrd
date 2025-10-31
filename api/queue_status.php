<?php
declare(strict_types=1);
require_once __DIR__ . '/_shared.php';

json_headers();
sess_start();
$pdo = pdo_or_die();

try {
  // Accept both JSON and querystring
  $in = json_decode(file_get_contents('php://input'), true) ?: [];
  $courseKey = $_GET['course_id'] ?? $in['course_id'] ?? null;
  $email     = $_GET['user_email'] ?? $in['user_email'] ?? ($_SESSION['email'] ?? null);
  $sessionId = isset($_GET['session_id']) && ctype_digit((string)$_GET['session_id']) ? (int)$_GET['session_id'] : (isset($in['session_id']) && ctype_digit((string)$in['session_id']) ? (int)$in['session_id'] : null);

  $courseId = null;
  if ($courseKey) {
    $courseId = canonical_course_id($pdo, $courseKey);
  }

  // total active (session-specific when session_id provided)
  if ($sessionId) {
    $tot = $pdo->prepare('SELECT COUNT(*) FROM queue_entries WHERE session_id = ? AND left_at IS NULL');
    $tot->execute([$sessionId]);
  } else {
    $tot = $pdo->prepare('SELECT COUNT(*) FROM queue_entries WHERE course_id=? AND left_at IS NULL');
    $tot->execute([$courseId]);
  }
  $total = (int)$tot->fetchColumn();

  // your position and notes (if logged in)
  $position = null;
  $notes = null;
  if ($email) {
    if ($sessionId) {
      $j = $pdo->prepare(
        'SELECT joined_at, notes FROM queue_entries
         WHERE session_id=? AND user_email=? AND left_at IS NULL
         ORDER BY joined_at ASC LIMIT 1'
      );
      $j->execute([$sessionId, $email]);
    } else {
      $j = $pdo->prepare(
        'SELECT joined_at, notes FROM queue_entries
         WHERE course_id=? AND user_email=? AND left_at IS NULL
         ORDER BY joined_at ASC LIMIT 1'
      );
      $j->execute([$courseId, $email]);
    }

    if ($row = $j->fetch(PDO::FETCH_ASSOC)) {
      $ja = $row['joined_at'];
      $notes = $row['notes'];
      if ($sessionId) {
        $pc = $pdo->prepare(
          'SELECT COUNT(*) FROM queue_entries
           WHERE session_id=? AND left_at IS NULL AND joined_at <= ?'
        );
        $pc->execute([$sessionId, $ja]);
      } else {
        $pc = $pdo->prepare(
          'SELECT COUNT(*) FROM queue_entries
           WHERE course_id=? AND left_at IS NULL AND joined_at <= ?'
        );
        $pc->execute([$courseId, $ja]);
      }
      $position = (int)$pc->fetchColumn();
    }
  }

  out(200, [
    'ok'       => true,
    'status'   => 'Active',
    'total'    => $total,
    'position' => $position,
    'notes'    => $notes,
  ]);
} catch (Throwable $e) {
  error_log('Queue status error: ' . $e->getMessage());
  out(500, ['ok'=>false,'error'=>'Server error']);
}
