<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

if (isset($_SERVER['HTTP_ORIGIN'])) {
  header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
  header('Access-Control-Allow-Credentials: true');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  exit;
}

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
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['match'=>false,'message'=>'DB connection error']);
  exit;
}

$stmt = $pdo->prepare('SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || $user['password_hash'] !== $password) {
  echo json_encode(['match'=>false,'message'=>'Invalid email or password']);
  exit;
}

session_start();
session_regenerate_id(true);
$_SESSION['user_id'] = (int)$user['id'];
$_SESSION['email']   = $user['email'];
$_SESSION['name']    = $user['name'];
$_SESSION['role']    = $user['role'];

echo json_encode([
  'match'   => true,
  'message' => 'Login successful',
  'name'    => $user['name'],
  'role'    => $user['role']
]);
