<?php
declare(strict_types=1);

require_once __DIR__ . '/_shared.php';

json_headers();
sess_start();

try {
  $pdo = pdo_or_die();

  // Detect whether users.avatar_seed column exists (some DBs may not have it)
  $avatarCheck = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_seed'");
  $avatarCheck->execute();
  $hasAvatarCol = (int)$avatarCheck->fetchColumn() > 0;
  $avatarSelect = $hasAvatarCol ? 'u.avatar_seed AS avatar_seed,' : "NULL AS avatar_seed,";

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

  // Active queue entries, oldest first, with user name (include attendance + avatar_seed)
  if ($session_id) {
    // If the DB has a session_id column on queue_entries use it. Otherwise
    // fall back to resolving the session -> course and query by course_id.
    $colCheck = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'queue_entries' AND COLUMN_NAME = 'session_id'");
    $colCheck->execute();
    $hasSessionCol = (int)$colCheck->fetchColumn() > 0;

    if ($hasSessionCol) {
      $sql = '
        SELECT 
          qe.user_email,
          qe.attendance,
          u.name AS display_name, '
          . $avatarSelect . '
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
      // resolve session -> course_id and query by course
      $q = $pdo->prepare('SELECT course_id FROM office_hours_sessions WHERE id = ? LIMIT 1');
      $q->execute([$session_id]);
      $foundCourse = $q->fetchColumn();
      if ($foundCourse) {
        $sql = '
          SELECT 
            qe.user_email,
            qe.attendance,
            u.name AS display_name, '
            . $avatarSelect . '
            qe.notes,
            qe.joined_at,
            qe.left_at
          FROM queue_entries qe
          LEFT JOIN users u ON u.email = qe.user_email
          WHERE qe.course_id = ? AND qe.left_at IS NULL
          ORDER BY qe.joined_at ASC
        ';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([(int)$foundCourse]);
      } else {
        // session doesn't exist - return empty queue
        echo json_encode(['ok'=>true, 'queue'=>[]]);
        exit;
      }
    }
  } else {
    $sql = '
      SELECT 
        qe.user_email,
        qe.attendance,
        u.name AS display_name, '
        . $avatarSelect . '
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
  $msg = $e->getMessage();
  error_log('Queue list error: ' . $msg . ' in ' . $e->getFile() . ':' . $e->getLine());
  http_response_code(500);
  // Return detail during debugging; remove or hide in production
  echo json_encode(['ok'=>false,'error'=>'Server error','detail'=>$msg]);
}
