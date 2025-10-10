<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
if (isset($_SERVER['HTTP_ORIGIN'])) { header('Vary: Origin'); header('Access-Control-Allow-Origin: '.$_SERVER['HTTP_ORIGIN']); header('Access-Control-Allow-Credentials: true'); }
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { header('Access-Control-Allow-Methods: POST, OPTIONS'); header('Access-Control-Allow-Headers: Content-Type'); http_response_code(204); exit; }

require_once __DIR__.'/db.php';
require_once __DIR__.'/auth.php';
require_once __DIR__.'/_course_id_from_input.php';

if (session_status() !== PHP_SESSION_ACTIVE) { ini_set('session.cookie_httponly','1'); session_start(); }
$u = current_user();
if (!$u) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'not_logged_in']); exit; }

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$rawCourse = $body['course_id'] ?? $body['course_code'] ?? null;
$notes     = isset($body['notes']) ? trim((string)$body['notes']) : '';

try {
  /** @var PDO $pdo */
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $course_id = resolve_course_id($pdo, $rawCourse);
  if ($course_id <= 0) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'bad_request']); exit; }

  $upd = $pdo->prepare('UPDATE queue_entries SET notes=? WHERE course_id=? AND user_email=?');
  $upd->execute([$notes, $course_id, $u['email'] ?? '']);
  echo json_encode(['ok'=>true]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>'server_error']);
}
