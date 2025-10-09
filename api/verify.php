<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

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

// NOTE: you’re storing plaintext in password_hash for now
if (!$user || $user['password_hash'] !== $password) {
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

/* ===== DEBUG + WRITE TOKEN ===== */
$debug = ['issued' => false, 'token_len' => null, 'token_prefix' => null, 'error' => null];

try {
  // rotate remember cookie + write hash to users.session_token
  issue_persistent_login($pdo, (int)$user['id']);
  $debug['issued'] = true;

  // read back what’s in DB
  $probe = $pdo->prepare('SELECT session_token, LENGTH(session_token) AS len FROM users WHERE id = ?');
  $probe->execute([(int)$user['id']]);
  $row = $probe->fetch(PDO::FETCH_ASSOC);
  if ($row) {
    $debug['token_len']    = isset($row['len']) ? (int)$row['len'] : null;              // expect 64
    $debug['token_prefix'] = $row['session_token'] ? substr($row['session_token'],0,12).'…' : null;
  }
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode([
    'match'   => false,
    'message' => 'Token/cookie step failed',
    'error'   => $e->getMessage(),
  ]);
  exit;
}
/* ===== END DEBUG ===== */

// Map DB role to frontend expectation
$response_role = ($user['role'] === 'instructor') ? 'professor' : $user['role'];

echo json_encode([
  'match'   => true,
  'message' => 'Login successful',
  'name'    => $user['name'],
  'role'    => $response_role,
  'debug'   => $debug, // remove this field after you confirm token_len === 64
]);
