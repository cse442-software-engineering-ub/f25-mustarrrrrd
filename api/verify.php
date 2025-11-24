<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/_shared.php';
require_once __DIR__ . '/auth.php';

json_headers();
set_cors_headers();

$in = read_json();
$email = clamp191($in['email'] ?? '');
$password = $in['password'] ?? '';

if (!$email || !$password) {
  out(400, ['match'=>false,'message'=>'Email and password required']);
}

try {
  $pdo = pdo_or_die();
} catch (Throwable $e) {
  out(500, ['match'=>false,'message'=>'DB connection error']);
}

$stmt = $pdo->prepare('SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

// Verify the password using password_verify()
if (!$user || !password_verify($password, $user['password_hash'])) {
  out(200, ['match'=>false,'message'=>'Invalid email or password']);
}

// Start/refresh PHP session using shared function
sess_start();
session_regenerate_id(true);
$_SESSION['user_id'] = (int)$user['id'];
$_SESSION['email']   = $user['email'];
$_SESSION['name']    = $user['name'];
$_SESSION['role']    = $user['role'];

// Issue persistent remember-me cookie (server hashes; DB stores hash)
issue_persistent_login($pdo, (int)$user['id']);

// Role is already 'professor' in aptitude DB, no mapping needed
out(200, [
  'match'   => true,
  'message' => 'Login successful',
  'name'    => $user['name'],
  'role'    => $user['role'],
]);
