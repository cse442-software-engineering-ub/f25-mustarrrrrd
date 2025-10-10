<?php
declare(strict_types=1);
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate'); // <- kill caches
header('Pragma: no-cache');

require_once __DIR__ . '/db.php';
if (session_status() !== PHP_SESSION_ACTIVE) { @session_start(); }

function jreply(int $code, array $payload) {
  http_response_code($code);
  echo json_encode($payload);
  exit;
}

function canonical_course_id(PDO $pdo, $key): int {
  if ($key === null || $key === '') throw new Exception('Missing course_id');
  if (ctype_digit((string)$key)) return (int)$key;
  $q = $pdo->prepare('SELECT id FROM courses WHERE code = ? LIMIT 1');
  $q->execute([(string)$key]);
  $id = $q->fetchColumn();
  if (!$id) throw new Exception('Unknown course code: '.(string)$key);
  return (int)$id;
}

try {
  $pdo = pdo();

  // accept JSON / form / query; fall back to session email
  $in        = read_json();
  $courseKey = $in['course_id'] ?? $_POST['course_id'] ?? $_GET['course_id'] ?? null;
  $email     = $in['user_email'] ?? $in['email'] ?? $_POST['user_email'] ?? $_GET['user_email'] ?? ($_SESSION['email'] ?? null);
  if (!$email) throw new Exception('Missing user_email');

  $courseId = canonical_course_id($pdo, $courseKey);

  $upd = $pdo->prepare('UPDATE queue_entries
                          SET left_at = NOW()
                        WHERE course_id = ? AND user_email = ? AND left_at IS NULL');
  $upd->execute([$courseId, $email]);

  // Log how many rows changed to catch mismatches
  error_log("QUEUE_LEAVE rows=" . $upd->rowCount() . " course_id=$courseId email=$email");

  jreply(200, ['ok'=>true]);
} catch (Throwable $e) {
  error_log("QUEUE_LEAVE exception: ".$e->getMessage());
  jreply(500, ['ok'=>false, 'error'=>$e->getMessage()]);
}
