<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

header('Content-Type: application/json');

// CORS (reflect origin; allow credentials)
if (isset($_SERVER['HTTP_ORIGIN'])) {
  header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
  header('Access-Control-Allow-Credentials: true');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  exit;
}

if (session_status() !== PHP_SESSION_ACTIVE) session_start();

/* Clear remember-me (DB hash + cookie) */
// FIX: Instead of relying on the shared session (which might be from a different tab/user),
// look up the user by the actual cookie token to ensure we clear the correct user's session
$token = $_COOKIE['remember_token'] ?? null;
if ($token) {
  $pdo = pdo();
  $hash = hash('sha256', $token);

  // Find the user by their token hash
  $stmt = $pdo->prepare('SELECT id FROM users WHERE session_token = ? LIMIT 1');
  $stmt->execute([$hash]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  if ($user) {
    // Clear this specific user's session token
    destroy_persistent_login($pdo, (int)$user['id']);
  } else {
    // Token not found in DB, just clear the cookie
    clear_remember_cookie();
  }
} else {
  // No token cookie, try using session as fallback
  $uid = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;
  if ($uid) {
    $pdo = pdo();
    destroy_persistent_login($pdo, $uid);
  } else {
    clear_remember_cookie();
  }
}

/* Clear PHP session data */
$_SESSION = [];
session_destroy();

/* Remove PHPSESSID cookie if set */
if (ini_get('session.use_cookies')) {
  $p = session_get_cookie_params();
  setcookie(session_name(), '', [
    'expires'  => time() - 42000,
    'path'     => $p['path'],
    'domain'   => $p['domain'],
    'secure'   => $p['secure'],
    'httponly' => $p['httponly'],
    'samesite' => $p['samesite'] ?? 'Lax',
  ]);
}

echo json_encode(['success' => true, 'message' => 'Logged out']);
exit;
