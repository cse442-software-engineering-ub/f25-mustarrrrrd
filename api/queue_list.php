<?php
declare(strict_types=1);

require_once __DIR__ . '/_shared.php';

json_headers();
sess_start();

try {
  $pdo = pdo_or_die();

  // Accept numeric ID or course code
  $course_id = canonical_course_id($pdo, $_GET['course_id'] ?? '');

  // Active queue entries, oldest first, with user name (include attendance)
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

  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode(['ok'=>true, 'queue'=>$rows]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}

