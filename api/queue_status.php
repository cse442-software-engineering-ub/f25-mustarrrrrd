<?php
// /api/queue_status.php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';
function fail($c,$m,$h=400){ http_response_code($h); echo json_encode(['ok'=>false,'code'=>$c,'message'=>$m]); exit; }

try {
  // GET or POST both fine
  $b = array_merge($_GET, read_json());
  $course = clamp191($b['course_id'] ?? '');
  $email  = clamp191($b['user_email'] ?? '');

  if ($course === '') fail('missing', 'course_id required');

  $pdo = pdo();

  $total = (int)$pdo->query("SELECT COUNT(*) FROM queue_entries WHERE course_id=".$pdo->quote($course))->fetchColumn();

  $position = null; $ahead = null; $behind = null;

  if ($email !== '') {
    $me = $pdo->prepare('SELECT joined_at FROM queue_entries WHERE course_id=? AND user_email=?');
    $me->execute([$course, $email]);
    if ($row = $me->fetch()) {
      $joined_at = $row['joined_at'];
      $aheadStmt = $pdo->prepare('SELECT COUNT(*) FROM queue_entries WHERE course_id=? AND joined_at < ?');
      $aheadStmt->execute([$course, $joined_at]);
      $ahead = (int)$aheadStmt->fetchColumn();
      $position = $ahead + 1;
      $behind = max(0, $total - $position);
    }
  }

  // Optional: list for professor view
  $list = [];
  if (!empty($b['include_list'])) {
    $listStmt = $pdo->prepare(
      'SELECT qe.user_email, qe.notes, qe.joined_at, u.name
       FROM queue_entries qe
       LEFT JOIN users u ON u.email = qe.user_email
       WHERE qe.course_id=?
       ORDER BY qe.joined_at ASC'
    );
    $listStmt->execute([$course]);
    $list = $listStmt->fetchAll();
  }

  echo json_encode(['ok'=>true,'course_id'=>$course,
    'total'=>$total,'position'=>$position,'ahead'=>$ahead,'behind'=>$behind,'list'=>$list
  ]);

} catch (Throwable $e) {
  fail('server','Unexpected error',500);
}
