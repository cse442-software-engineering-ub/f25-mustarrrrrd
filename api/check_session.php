<?php
declare(strict_types=1);
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);
error_log("check_session.php started", 0);

require_once __DIR__ . '/db.php';

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

// Start session (shared across /app and /api)
if (session_status() !== PHP_SESSION_ACTIVE) {
  session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',   // share across /app/ and /api/
    'domain'   => '',
    'secure'   => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
    'httponly' => true,
    'samesite' => 'Lax',
  ]);
  session_start();
}

function reply($ok, $extra = []) {
  echo json_encode(array_merge(['ok' => $ok], $extra));
  exit;
}

// 1️⃣ If session already has the user — return full info
if (!empty($_SESSION['user_id'])) {
  reply(true, [
    'loggedIn' => true,
    'user_id'  => $_SESSION['user_id'],
    'email'    => $_SESSION['email'] ?? '',
    'name'     => $_SESSION['name'] ?? '',
    'role'     => $_SESSION['role'] ?? '',
  ]);
}

// 2️⃣ Otherwise, try to rebuild from a remember_token (optional)
error_log("check_session.php reached token check", 0);
$token = $_COOKIE['remember_token'] ?? null;
if ($token) {
  try {
    $pdo = pdo();
    error_log("pdo happened", 0);
    $stmt = $pdo->prepare('SELECT id, email, name, role FROM users WHERE remember_token = ? LIMIT 1');
    $stmt->execute([$token]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row && isset($row['id'])) {
      $_SESSION['user_id'] = (int)$row['id'];
      $_SESSION['email']   = $row['email'];
      $_SESSION['name']    = $row['name'];
      $_SESSION['role']    = $row['role'];

      reply(true, [
        'loggedIn' => true,
        'user_id'  => (int)$row['id'],
        'email'    => $row['email'],
        'name'     => $row['name'],
        'role'     => $row['role']
      ]);
    }
  } catch (Throwable $e) {
    reply(false, ['loggedIn' => false, 'error' => $e->getMessage()]);
  }
}

// 3️⃣ No session and no token
reply(true, ['loggedIn' => false]);

