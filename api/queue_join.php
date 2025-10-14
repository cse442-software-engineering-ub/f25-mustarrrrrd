<?php
declare(strict_types=1);
require_once __DIR__ . '/_shared.php';

json_headers();
sess_start();
$pdo = pdo_or_die();

try {
  $in        = json_decode(file_get_contents('php://input'), true) ?: [];
  $courseKey = $in['course_id']  ?? $_POST['course_id']  ?? $_GET['course_id']  ?? null;
  $email     = $in['user_email'] ?? $_POST['user_email'] ?? $_GET['user_email'] ?? ($_SESSION['email'] ?? null);
  $notes     = clamp191($in['notes'] ?? $_POST['notes'] ?? $_GET['notes'] ?? '');

  if (!$email) throw new Exception('Missing user_email');
  $courseId = canonical_course_id($pdo, $courseKey);

  // already active? update notes (idempotent)
  $chk = $pdo->prepare('SELECT id FROM queue_entries WHERE course_id=? AND user_email=? AND left_at IS NULL LIMIT 1');
  $chk->execute([$courseId, $email]);
  if ($id = $chk->fetchColumn()) {
    $u = $pdo->prepare('UPDATE queue_entries SET notes=? WHERE id=?');
    $u->execute([$notes, $id]);
  } else {
    // reactivate last row
    $react = $pdo->prepare(
      'UPDATE queue_entries
          SET left_at=NULL, joined_at=NOW(), notes=?
        WHERE course_id=? AND user_email=? AND left_at IS NOT NULL
        ORDER BY joined_at DESC
        LIMIT 1'
    );
    $react->execute([$notes, $courseId, $email]);
    if ($react->rowCount() === 0) {
      // first time ever
      $ins = $pdo->prepare(
        'INSERT INTO queue_entries (course_id, user_email, notes, joined_at)
         VALUES (?, ?, ?, NOW())'
      );
      $ins->execute([$courseId, $email, $notes]);
    }
  }

  // quick status
  $tot = $pdo->prepare('SELECT COUNT(*) FROM queue_entries WHERE course_id=? AND left_at IS NULL');
  $tot->execute([$courseId]);
  // position
  $j = $pdo->prepare('SELECT joined_at FROM queue_entries WHERE course_id=? AND user_email=? AND left_at IS NULL ORDER BY joined_at ASC LIMIT 1');
  $j->execute([$courseId, $email]);
  $pos = null;
  if ($ja = $j->fetchColumn()) {
    $pc = $pdo->prepare('SELECT COUNT(*) FROM queue_entries WHERE course_id=? AND left_at IS NULL AND joined_at <= ?');
    $pc->execute([$courseId, $ja]);
    $pos = (int)$pc->fetchColumn();
  }

  out(200, ['ok'=>true,'total'=>(int)$tot->fetchColumn(),'position'=>$pos,'status'=>'Active']);
} catch (Throwable $e) {
  out(500, ['ok'=>false,'error'=>$e->getMessage()]);
}
