<?php
// /api/queue_join.php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';

function fail($code, $msg, $http=400){ http_response_code($http); echo json_encode(['ok'=>false,'code'=>$code,'message'=>$msg]); exit; }

try {
  $b = read_json();
  $course = clamp191($b['course_id'] ?? '');
  $email  = clamp191($b['user_email'] ?? '');
  $notes  = trim((string)($b['notes'] ?? ''));

  if ($course === '' || $email === '') fail('missing', 'course_id and user_email are required');

  $pdo = pdo();
  // Try insert; if already there, update notes (optional)
  $pdo->beginTransaction();
  try {
    $ins = $pdo->prepare(
      'INSERT INTO queue_entries (course_id, user_email, notes) VALUES (?, ?, ?)'
    );
    $ins->execute([$course, $email, $notes !== '' ? $notes : null]);
  } catch (PDOException $e) {
    // Duplicate -> just update notes if provided
    if ($e->errorInfo[1] == 1062 && $notes !== '') {
      $up = $pdo->prepare('UPDATE queue_entries SET notes=? WHERE course_id=? AND user_email=?');
      $up->execute([$notes, $course, $email]);
    }
  }

  // Compute status
  $me = $pdo->prepare('SELECT joined_at FROM queue_entries WHERE course_id=? AND user_email=?');
  $me->execute([$course, $email]);
  $mine = $me->fetch();
  if (!$mine) { $pdo->rollBack(); fail('not_joined', 'Could not join queue'); }

  $joined_at = $mine['joined_at'];

  $total = (int)$pdo->query("SELECT COUNT(*) FROM queue_entries WHERE course_id=".$pdo->quote($course))->fetchColumn();

  $aheadStmt = $pdo->prepare('SELECT COUNT(*) FROM queue_entries WHERE course_id=? AND joined_at < ?');
  $aheadStmt->execute([$course, $joined_at]);
  $ahead = (int)$aheadStmt->fetchColumn();

  $position = $ahead + 1;
  $behind   = max(0, $total - $position);

  $pdo->commit();

  echo json_encode(['ok'=>true, 'course_id'=>$course, 'email'=>$email,
    'status'=>['position'=>$position,'ahead'=>$ahead,'behind'=>$behind,'total'=>$total]
  ]);

} catch (Throwable $e) {
  fail('server', 'Unexpected error', 500);
}
