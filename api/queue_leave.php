<?php
// /api/queue_leave.php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';
function fail($c,$m,$h=400){ http_response_code($h); echo json_encode(['ok'=>false,'code'=>$c,'message'=>$m]); exit; }

try {
  $b = read_json();
  $course = clamp191($b['course_id'] ?? '');
  $email  = clamp191($b['user_email'] ?? '');
  if ($course === '' || $email === '') fail('missing','course_id and user_email are required');

  $pdo = pdo();
  $d = $pdo->prepare('DELETE FROM queue_entries WHERE course_id=? AND user_email=?');
  $d->execute([$course, $email]);

  echo json_encode(['ok'=>true]);
} catch (Throwable $e) {
  fail('server','Unexpected error',500);
}
