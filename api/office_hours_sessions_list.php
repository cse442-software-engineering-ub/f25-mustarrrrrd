<?php
declare(strict_types=1);
require_once __DIR__ . '/_shared.php';

set_cors_headers();
json_headers();
sess_start();

try {
  $pdo = pdo_or_die();
  $courseKey = $_GET['course_id'] ?? null;
  if (!$courseKey) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'missing_course_id']); exit; }

  $course_id = canonical_course_id($pdo, $courseKey);

  $sql = "
    SELECT s.id, s.day_of_week, DATE_FORMAT(s.start_time, '%h:%i %p') AS start_time, DATE_FORMAT(s.end_time, '%h:%i %p') AS end_time, s.location, s.instructor_id, s.created_at,
           COALESCE(NULLIF(u.name, ''), u.email) AS instructor_name, u.email AS instructor_email
    FROM office_hours_sessions s
    LEFT JOIN users u ON u.id = s.instructor_id
  WHERE course_id = ?
  ORDER BY FIELD(day_of_week, 'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'), start_time ASC
  ";

  $stmt = $pdo->prepare($sql);
  $stmt->execute([$course_id]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode(['ok'=>true,'sessions'=>$rows]);
} catch (Throwable $e) {
  $msg = $e->getMessage();
  error_log('Office hours sessions list error: ' . $msg . ' in ' . $e->getFile() . ':' . $e->getLine());
  http_response_code(500);
  // Return detail during debugging — remove or reduce before production
  echo json_encode(['ok'=>false,'error'=>'Server error','detail'=>$msg]);
}
