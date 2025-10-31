<?php
declare(strict_types=1);

require_once __DIR__ . '/_shared.php';

json_headers();
sess_start();

try {
  $pdo = pdo_or_die();

  // Accept numeric ID or course code (optional when session_id provided)
  $courseKey = isset($_GET['course_id']) ? trim((string)$_GET['course_id']) : null;
  $course_id = null;
  // optional session filter
  $session_id = isset($_GET['session_id']) && ctype_digit((string)$_GET['session_id']) ? (int)$_GET['session_id'] : null;
  if ($courseKey) {
    $course_id = canonical_course_id($pdo, $courseKey);
  }

  if (!$session_id && !$course_id) {
    http_response_code(400);
    echo json_encode(['ok'=>false,'error'=>'Missing course_id']);
    exit;
  }

  // Active queue entries, oldest first, with user name (include attendance)
  if ($session_id) {
    $sql = '
      SELECT 
        qe.user_email,
        qe.attendance,
        u.name AS display_name,
        qe.notes,
        qe.joined_at,
        qe.left_at
      FROM queue_entries qe
      LEFT JOIN users u ON u.email = qe.user_email
      WHERE qe.session_id = ? AND qe.left_at IS NULL
      ORDER BY qe.joined_at ASC
    ';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$session_id]);
  } else {
    $sql = '
      SELECT 
        qe.user_email,
        qe.attendance,
        u.name AS display_name,
        qe.notes,
        qe.joined_at,
        qe.left_at
      FROM queue_entries qe
      LEFT JOIN users u ON u.email = qe.user_email
      WHERE qe.course_id = ? AND qe.left_at IS NULL
      ORDER BY qe.joined_at ASC
    ';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$course_id]);
  }

  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode(['ok'=>true, 'queue'=>$rows]);
} catch (Throwable $e) {
  error_log('Queue list error: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>'Server error']);
}

