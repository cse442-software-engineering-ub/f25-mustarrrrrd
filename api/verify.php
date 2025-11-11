<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

header('Content-Type: application/json');
set_cors_headers();

$in = read_json();
$email = clamp191($in['email'] ?? '');
$password = $in['password'] ?? '';

if (!$email || !$password) {
  http_response_code(400);
  echo json_encode(['match'=>false,'message'=>'Email and password required']);
  exit;
}

try {
  $pdo = pdo();
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['match'=>false,'message'=>'DB connection error']);
  exit;
}

$stmt = $pdo->prepare('SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

// Verify the password using password_verify()
if (!$user || !password_verify($password, $user['password_hash'])) {
  echo json_encode(['match'=>false,'message'=>'Invalid email or password']);
  exit;
}

// Start/refresh PHP session
session_start();
session_regenerate_id(true);
$_SESSION['user_id'] = (int)$user['id'];
$_SESSION['email']   = $user['email'];
$_SESSION['name']    = $user['name'];
$_SESSION['role']    = $user['role'];

// Issue persistent remember-me cookie (server hashes; DB stores hash)
issue_persistent_login($pdo, (int)$user['id']);

session_write_close();

// Role is already 'professor' in aptitude DB, no mapping needed
echo json_encode([
  'match'   => true,
  'message' => 'Login successful',
  'name'    => $user['name'],
  'role'    => $user['role'],
]);
