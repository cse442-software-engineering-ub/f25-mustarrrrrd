<?php
declare(strict_types=1);
require_once(__DIR__ . "/_shared.php");
json_headers();
sess_start();
$pdo = pdo_or_die();

try {
  $session = $_SESSION['email'] ?? null;
  if (!$session) {
    out(401, ['ok' => false, 'error' => 'Not logged in']);
    exit;
  }

  $stmt = $pdo->prepare('
    SELECT c.id, c.code, c.title, c.lecture_times, c.room, c.professor
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    JOIN users u ON u.id = e.user_id
    WHERE u.email = ? AND e.role_in_course = "professor"
  ');
  $stmt->execute([$session]);
  $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);

  out(200, ['ok' => true, 'courses' => $courses]);
} catch (Throwable $e) {
  out(500, ['ok' => false, 'error' => $e->getMessage()]);
}
