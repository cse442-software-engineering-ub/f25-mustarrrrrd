<?php
// /api/queue_save_notes.php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';
function fail($c,$m,$h=400){ http_response_code($h); echo json_encode(['ok'=>false,'code'=>$c,'message'=>$m]); exit; }

try {
  $b = read_json();
  $course = clamp191($b['course_id'] ?? '');
  $email  = clamp191($b['user_email'] ?? '');
  $notes  = trim((string)($b['notes'] ?? ''));

  if ($course === '' || $email === '') fail('missing','course_id and user_email are required');

  $pdo = pdo();
  $u = $pdo->prepare('UPDATE queue_entries SET notes=? WHERE course_id=? AND user_email=?');
  $u->execute([$notes !== '' ? $notes : null, $course, $email]);

  echo json_encode(['ok'=>true]);
} catch (Throwable $e) {
  fail('server','Unexpected error',500);
}
