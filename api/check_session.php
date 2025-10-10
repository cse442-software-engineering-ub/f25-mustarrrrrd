<?php
declare(strict_types=1);

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

// Make sure app and API share the same cookie scope (parent of /app and /api).
// If your site root is deeper, set that path (e.g. '/CSE442/2025-Fall/cse-442ai/auto_oh/').
if (session_status() !== PHP_SESSION_ACTIVE) {
  session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',   // share across /app/ and /api/
    'domain'   => '',    // current host
    'secure'   => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
    'httponly' => true,
    'samesite' => 'Lax',
  ]);
  session_start();
}

require_once __DIR__ . '/db.php';

function reply($ok, $extra = []) {
  echo json_encode(array_merge(['ok' => $ok], $extra));
  exit;
}

// 1) If session already has the user, we're done.
if (!empty($_SESSION['email'])) {
  reply(true, ['loggedIn' => true, 'email' => $_SESSION['email']]);
}

// 2) Otherwise, try to rebuild the session from a remember_token cookie (if you use one).
$token = $_COOKIE['remember_token'] ?? null;
if ($token) {
  try {
    $pdo = pdo();

    // Adjust to your schema. Common patterns:
    //   users(email, remember_token)
    //   users(email, remember_token_hash)  -> then verify with password_verify
    $stmt = $pdo->prepare('SELECT email, remember_token FROM users WHERE remember_token = ? LIMIT 1');
    $stmt->execute([$token]);
    $row = $stmt->fetch();

    if ($row && isset($row['email'])) {
      // Rebuild the session
      $_SESSION['email'] = $row['email'];
      reply(true, ['loggedIn' => true, 'email' => $row['email']]);
    }
  } catch (Throwable $e) {
    // In production you might hide this; for aptitude debugging it's useful.
    echo json_encode(['ok' => false, 'loggedIn' => false, 'error' => $e->getMessage()]);
    http_response_code(200);
    exit;
  }
}

// 3) No session and no valid token -> not logged in
reply(true, ['loggedIn' => false]);
