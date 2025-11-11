<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

function json_headers(): void {
  header('Content-Type: application/json');
  header('Cache-Control: no-store, no-cache, must-revalidate');
  header('Pragma: no-cache');
}

function sess_start(): void {
  if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
      'lifetime' => 0,
      'path'     => '/',   // share across /app and /api on Aptitude
      'domain'   => '',
      'secure'   => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
      'httponly' => true,
      'samesite' => 'Lax',
    ]);
    session_start();
  }
}

function pdo_or_die(): PDO {
  try { return pdo(); }
  catch (Throwable $e) {
    error_log('DB connection failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>'Database connection error']);
    exit;
  }
}

function out(int $code, array $payload): void {
  http_response_code($code);
  echo json_encode($payload);
  exit;
}

/** Accepts numeric id or course code; returns numeric id. */
function canonical_course_id(PDO $pdo, $key): int {
  if ($key === null || $key === '') throw new Exception('Missing course_id');
  $raw = trim((string)$key);
  if (ctype_digit($raw)) return (int)$raw;

  $q = $pdo->prepare('SELECT id FROM courses WHERE code = ? LIMIT 1');
  $q->execute([$raw]);
  $id = $q->fetchColumn();
  if ($id) return (int)$id;

  $q = $pdo->prepare('SELECT id FROM courses WHERE UPPER(TRIM(code)) = UPPER(?) LIMIT 1');
  $q->execute([$raw]);
  $id = $q->fetchColumn();
  if ($id) return (int)$id;

  throw new Exception("Unknown course identifier '$raw'");
}
