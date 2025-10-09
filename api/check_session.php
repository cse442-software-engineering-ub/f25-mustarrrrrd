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
  header('Access-Control-Allow-Methods: GET, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  exit;
}

/* Prefer PHP session; fall back to remember-me cookie */
$u = current_user();

if ($u) {
  $role = ($u['role'] === 'instructor') ? 'professor' : $u['role'];
  echo json_encode([
    'loggedIn' => true,
    'role' => $role,
    'user' => [
      'id'    => (int)$u['id'],
      'email' => $u['email'],
      'name'  => $u['name'] ?? '',
    ],
  ]);
} else {
  echo json_encode(['loggedIn' => false]);
}
