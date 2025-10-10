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

  $courseId = canonical_course_id($pdo, $courseKey);

  // total active
  $tot = $pdo->prepare('SELECT COUNT(*) FROM queue_entries WHERE course_id=? AND left_at IS NULL');
  $tot->execute([$courseId]);
  $total = (int)$tot->fetchColumn();

  // your position (if logged in)
  $position = null;
  if ($email) {
    $j = $pdo->prepare(
      'SELECT joined_at FROM queue_entries
       WHERE course_id=? AND user_email=? AND left_at IS NULL
       ORDER BY joined_at ASC LIMIT 1'
    );
    $j->execute([$courseId, $email]);
    if ($ja = $j->fetchColumn()) {
      $pc = $pdo->prepare(
        'SELECT COUNT(*) FROM queue_entries
         WHERE course_id=? AND left_at IS NULL AND joined_at <= ?'
      );
      $pc->execute([$courseId, $ja]);
      $position = (int)$pc->fetchColumn();
    }
  }

  out(200, [
    'ok'       => true,
    'status'   => 'Active',
    'total'    => $total,
    'position' => $position,
  ]);
} catch (Throwable $e) {
  out(500, ['ok'=>false,'error'=>$e->getMessage()]);
}
