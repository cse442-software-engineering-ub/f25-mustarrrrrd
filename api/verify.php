<?php
header('Content-Type: application/json');

// CORS (adjust/remove as needed)
$allowed_origin = 'http://localhost:5173';
if (isset($_SERVER['HTTP_ORIGIN']) && $_SERVER['HTTP_ORIGIN'] === $allowed_origin) {
  header('Access-Control-Allow-Origin: ' . $allowed_origin);
  header('Access-Control-Allow-Credentials: true');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  exit;
}

// Read JSON body
$in = json_decode(file_get_contents('php://input'), true) ?: [];
$email = trim($in['email'] ?? '');
$password = $in['password'] ?? '';

if (!$email || !$password) {
  http_response_code(400);
  echo json_encode(['match'=>false,'message'=>'Email and password required']);
  exit;
}

// DB connection
$dbHost='127.0.0.1';
$dbName='cse442_2025_fall_team_ai_db';
$dbUser='root';
$dbPass='';
$dsn="mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4";

try {
  $pdo = new PDO($dsn, $dbUser, $dbPass, [
    PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
  ]);
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
