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

function fail($msg, $http=400, $extra=[]) {
  http_response_code($http);
  echo json_encode(['ok'=>false,'message'=>$msg] + $extra);
  exit;
}

// Headers first
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

// Includes: need BOTH db.php and auth.php for pdo(), read_json(), current_user()
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

// Get current user (via session or remember cookie)
$u = current_user();
if (!$u) fail('Not signed in', 401);

$in = read_json();
if (!is_array($in)) fail('Bad JSON');

// Only allow these columns to be edited
$allowed = ['name','preferred_name','pronouns','academic_year','major','disabilities'];

// Track present keys exactly as sent by client (so we don’t overwrite fields you didn’t touch)
$present = [];
foreach ($allowed as $k) {
  if (array_key_exists($k, $in)) $present[$k] = true;
}

// If nothing to update, bail early
if (!$present) {
  echo json_encode(['ok'=>true,'rows'=>0,'message'=>'No changes']);
  exit;
}

// Build UPDATE dynamically, binding NULLs correctly
$sets = [];
$params = [':id' => (int)$u['id']];

foreach ($allowed as $k) {
  if (!isset($present[$k])) continue;

  // clamp short fields (except disabilities which can be long text)
  $val = $in[$k];
  if ($k !== 'disabilities') {
    if ($val !== null) $val = clamp191((string)$val);
  } else {
    if ($val !== null) $val = (string)$val;
  }

  $sets[] = "$k = :$k";
  $params[":$k"] = $val;
}

$sql = "UPDATE users SET ".implode(', ', $sets)." WHERE id = :id LIMIT 1";

try {
  $pdo = pdo();
  $stmt = $pdo->prepare($sql);

  // Bind values: PDO::PARAM_NULL for NULL, otherwise string
  foreach ($params as $k => $v) {
    if ($v === null) $stmt->bindValue($k, null, PDO::PARAM_NULL);
    else             $stmt->bindValue($k, $v,   PDO::PARAM_STR);
  }

  $stmt->execute();
  $rows = $stmt->rowCount();

  // Re-fetch updated profile
  $get = $pdo->prepare('SELECT name, preferred_name, email, pronouns, academic_year, major, disabilities, role FROM users WHERE id = ? LIMIT 1');
  $get->execute([(int)$u['id']]);
  $row = $get->fetch();
  if (!$row) fail('Profile not found after update', 404);

  echo json_encode([
    'ok' => true,
    'rows' => $rows,
    'profile' => [
      'name' => $row['name'],
      'preferred_name' => $row['preferred_name'],
      'email' => $row['email'],
      'pronouns' => $row['pronouns'],
      'academic_year' => $row['academic_year'],
      'major' => $row['major'],
      'disabilities' => $row['disabilities'],
      'role' => ($row['role'] === 'instructor' ? 'professor' : $row['role']),
    ],
  ]);
} catch (Throwable $e) {
  // Show real error while you’re debugging; swap to a generic message later
  http_response_code(500);
  echo json_encode(['ok'=>false,'message'=>'Server error','error'=>$e->getMessage(),'sql'=>$sql]);
}
