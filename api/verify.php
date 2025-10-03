<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

// CORS
if (isset($_SERVER['HTTP_ORIGIN'])) {
  header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
  header('Access-Control-Allow-Credentials: true');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  exit;
}

// Read JSON body
$in = read_json();
$email = clamp191($in['email'] ?? '');
$password = $in['password'] ?? '';

if (!$email || !$password) {
  http_response_code(400);
  echo json_encode(['match'=>false,'message'=>'Email and password required']);
  exit;
}

// Get PDO connection from db.php
try {
  $pdo = pdo();
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['match'=>false,'message'=>'DB connection error']);
  exit;
}

// Query by email
$stmt = $pdo->prepare('SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();

// Compare directly with password_hash column (plain text)
if (!$user || $user['password_hash'] !== $password) {
  echo json_encode(['match'=>false,'message'=>'Invalid email or password']);
  exit;
}

// Success
session_start();
session_regenerate_id(true);
$_SESSION['user_id'] = (int)$user['id'];
$_SESSION['email']   = $user['email'];
$_SESSION['name']    = $user['name'];

echo json_encode([
  'match'=>true,
  'message'=>'Login successful',
  'name'=>$user['name']
]);