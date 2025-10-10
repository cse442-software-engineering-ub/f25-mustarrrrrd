<?php
declare(strict_types=1);
header('Content-Type: application/json');

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
  $q->execute([ (string)$key ]);
  $id = $q->fetchColumn();
  if (!$id) throw new Exception("Unknown course code: " . (string)$key);
  return (int)$id;
}

try {
  $pdo = pdo();

  $courseKey = $_GET['course_id'] ?? $_POST['course_id'] ?? null;
  $courseId = canonical_course_id($pdo, $courseKey);

  $userEmail = $_SESSION['email'] ?? ($_GET['user_email'] ?? $_POST['user_email'] ?? null);

  $tot = $pdo->prepare('SELECT COUNT(*) FROM queue_entries WHERE course_id = ? AND left_at IS NULL');
  $tot->execute([$courseId]);
  $total = (int)$tot->fetchColumn();

  $position = null;
  if ($userEmail) {
    $joinedQ = $pdo->prepare('SELECT joined_at FROM queue_entries WHERE course_id = ? AND user_email = ? AND left_at IS NULL ORDER BY joined_at ASC LIMIT 1');
    $joinedQ->execute([$courseId, $userEmail]);
    if ($joinedAt = $joinedQ->fetchColumn()) {
      $posQ = $pdo->prepare('SELECT COUNT(*) FROM queue_entries WHERE course_id = ? AND left_at IS NULL AND joined_at <= ?');
      $posQ->execute([$courseId, $joinedAt]);
      $position = (int)$posQ->fetchColumn();
    }
  }

  jreply(200, ['ok'=>true, 'total'=>$total, 'position'=>$position, 'status'=>'Active']);
} catch (Throwable $e) {
  error_log("QUEUE_STATUS exception: ".$e->getMessage());
  jreply(500, ['ok'=>false, 'error'=>$e->getMessage()]);
}
