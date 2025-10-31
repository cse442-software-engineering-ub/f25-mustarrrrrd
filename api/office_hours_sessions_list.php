<?php
declare(strict_types=1);
require_once __DIR__ . '/_shared.php';

json_headers();
sess_start();

try {
  $pdo = pdo_or_die();
  $courseKey = $_GET['course_id'] ?? null;
  if (!$courseKey) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'missing_course_id']); exit; }

  $course_id = canonical_course_id($pdo, $courseKey);

  $sql = '
    SELECT id, day_of_week, DATE_FORMAT(start_time, "%h:%i %p") AS start_time, DATE_FORMAT(end_time, "%h:%i %p") AS end_time, location, instructor_id, created_at
    FROM office_hours_sessions
    WHERE course_id = ?
    ORDER BY FIELD(day_of_week, "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"), start_time ASC
  ';

  $stmt = $pdo->prepare($sql);
  $stmt->execute([$course_id]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode(['ok'=>true,'sessions'=>$rows]);
} catch (Throwable $e) {
  error_log('Office hours sessions list error: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>'Server error']);
}
