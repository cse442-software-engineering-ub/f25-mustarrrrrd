<?php
declare(strict_types=1);
require_once __DIR__ . '/_shared.php';

json_headers();
sess_start();

try {
  $pdo = pdo_or_die();
  $id = isset($_GET['session_id']) && ctype_digit((string)$_GET['session_id']) ? (int)$_GET['session_id'] : null;
  if (!$id) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'missing_session_id']); exit; }

  $sql = 'SELECT id, course_id, day_of_week, DATE_FORMAT(start_time, "%h:%i %p") AS start_time, DATE_FORMAT(end_time, "%h:%i %p") AS end_time, location, instructor_id, created_at FROM office_hours_sessions WHERE id = ? LIMIT 1';
  $stmt = $pdo->prepare($sql);
  $stmt->execute([$id]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$row) { echo json_encode(['ok'=>false,'error'=>'not_found']); exit; }

  echo json_encode(['ok'=>true,'session'=>$row]);
} catch (Throwable $e) {
  error_log('Office hours session get error: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>'Server error']);
}
