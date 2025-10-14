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
$uid = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;
if ($uid) {
  $pdo = pdo();
  destroy_persistent_login($pdo, $uid);
} else {
  clear_remember_cookie();
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
