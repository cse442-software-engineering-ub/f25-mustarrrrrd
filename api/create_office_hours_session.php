<?php
declare(strict_types=1);
require_once __DIR__ . '/_shared.php';
require_once __DIR__ . '/auth.php';

json_headers();
sess_start();

$u = current_user();
if (!$u) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'not_logged_in']); exit; }

try {
  $pdo = pdo_or_die();
  $body = json_decode(file_get_contents('php://input'), true) ?: [];
  $courseKey = $body['course_id'] ?? null;
  $day = $body['day_of_week'] ?? null;
  $start = $body['start_time'] ?? null; // expected HH:MM
  $end = $body['end_time'] ?? null; // expected HH:MM
  $location = isset($body['location']) ? trim((string)$body['location']) : '';

  if (!$courseKey || !$day || !$start || !$end) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'missing_fields']); exit; }

  // Validate day of week
  $validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  if (!in_array($day, $validDays, true)) {
    http_response_code(400);
    echo json_encode(['ok'=>false,'error'=>'invalid_day_of_week']);
    exit;
  }

  // Validate time format (HH:MM)
  if (!preg_match('/^\d{2}:\d{2}$/', $start) || !preg_match('/^\d{2}:\d{2}$/', $end)) {
    http_response_code(400);
    echo json_encode(['ok'=>false,'error'=>'invalid_time_format']);
    exit;
  }

  // Validate times are valid (00:00 to 23:59)
  list($start_h, $start_m) = explode(':', $start);
  list($end_h, $end_m) = explode(':', $end);
  if ((int)$start_h > 23 || (int)$start_m > 59 || (int)$end_h > 23 || (int)$end_m > 59) {
    http_response_code(400);
    echo json_encode(['ok'=>false,'error'=>'invalid_time_values']);
    exit;
  }

  $course_id = canonical_course_id($pdo, $courseKey);

  // Insert
  $ins = $pdo->prepare('INSERT INTO office_hours_sessions (course_id, day_of_week, start_time, end_time, location, instructor_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())');
  $ins->execute([$course_id, $day, $start . ':00', $end . ':00', $location, $u['id'] ?? 0]);

  echo json_encode(['ok'=>true,'id'=>$pdo->lastInsertId()]);
} catch (Throwable $e) {
  error_log('Create office hours session error: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>'Server error']);
}
