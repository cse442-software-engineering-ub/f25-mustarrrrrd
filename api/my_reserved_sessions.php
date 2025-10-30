<?php
declare(strict_types=1);
require_once __DIR__ . '/_shared.php';

json_headers();
sess_start();

try {
  $pdo = pdo_or_die();
  $email = $_SESSION['email'] ?? null;

  if (!$email) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Not authenticated']);
    exit;
  }

  // Get all reserved sessions (queue entries with session_id that are not currently active)
  // A session is "reserved" if:
  // 1. User has a queue entry with left_at IS NULL
  // 2. session_id is not NULL
  // 3. Session is in the future (not currently active)

  $sql = '
    SELECT
      qe.id as queue_entry_id,
      qe.joined_at,
      qe.notes,
      ohs.id as session_id,
      ohs.day_of_week,
      ohs.start_time,
      ohs.end_time,
      ohs.location,
      c.id as course_id,
      c.code as course_code,
      c.title as course_title,
      u.name as instructor_name
    FROM queue_entries qe
    JOIN office_hours_sessions ohs ON qe.session_id = ohs.id
    JOIN courses c ON qe.course_id = c.id
    LEFT JOIN users u ON ohs.instructor_id = u.id
    WHERE qe.user_email = ?
      AND qe.left_at IS NULL
      AND qe.session_id IS NOT NULL
      AND NOT (
        ohs.day_of_week = DAYNAME(NOW())
        AND CURTIME() BETWEEN ohs.start_time AND ohs.end_time
      )
    ORDER BY
      FIELD(ohs.day_of_week, "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"),
      ohs.start_time ASC
  ';

  $stmt = $pdo->prepare($sql);
  $stmt->execute([$email]);
  $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);

  // Format the data for frontend
  $formattedSessions = array_map(function($session) {
    return [
      'queueEntryId' => $session['queue_entry_id'],
      'sessionId' => $session['session_id'],
      'courseId' => $session['course_id'],
      'courseCode' => $session['course_code'],
      'courseTitle' => $session['course_title'],
      'professor' => $session['professor'],
      'instructor' => $session['instructor_name'],
      'dayOfWeek' => $session['day_of_week'],
      'startTime' => date('g:i A', strtotime($session['start_time'])),
      'endTime' => date('g:i A', strtotime($session['end_time'])),
      'location' => $session['location'],
      'joinedAt' => $session['joined_at'],
      'notes' => $session['notes']
    ];
  }, $sessions);

  echo json_encode(['ok' => true, 'sessions' => $formattedSessions]);

} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
