<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

header('Content-Type: application/json');
set_cors_headers();

function fail($msg, $http=400, $extra=[]) {
  http_response_code($http);
  echo json_encode(['ok'=>false,'message'=>$msg] + $extra);
  exit;
}

// Get current user (via session or remember-cookie)
$u = current_user();
if (!$u) fail('Not signed in', 401);

$in = read_json();
if (!is_array($in)) fail('Bad JSON');

// Allow avatar_seed edits too
$allowed = [
  'name',
  'preferred_name',
  'pronouns',
  'academic_year',
  'major',
  'avatar_seed'  // ★ added avatar seed
];

// Track present keys exactly as sent by client
$present = [];
foreach ($allowed as $k) {
  if (array_key_exists($k, $in)) $present[$k] = true;
}

// If nothing to update, bail early
if (!$present) {
  echo json_encode(['ok'=>true,'rows'=>0,'message'=>'No changes']);
  exit;
}

// Build UPDATE dynamically
$sets   = [];
$params = [':id' => (int)$u['id']];

foreach ($allowed as $k) {
  if (!isset($present[$k])) continue;

  $val = $in[$k];
  if ($val !== null) $val = (string)$val;

  $sets[] = "$k = :$k";
  $params[":$k"] = $val;
}

$sql = "UPDATE users SET " . implode(', ', $sets) . " WHERE id = :id LIMIT 1";

try {
  $pdo = pdo();
  $stmt = $pdo->prepare($sql);

  foreach ($params as $k => $v) {
    if ($v === null) $stmt->bindValue($k, null, PDO::PARAM_NULL);
    else             $stmt->bindValue($k, $v,   PDO::PARAM_STR);
  }

  $stmt->execute();
  $rows = $stmt->rowCount();

  // Re-fetch updated profile — now includes avatar_seed ★
  $get = $pdo->prepare("
    SELECT 
      name,
      preferred_name,
      email,
      pronouns,
      academic_year,
      major,
      role,
      avatar_seed   -- ★ include avatar_seed
    FROM users
    WHERE id = ?
    LIMIT 1
  ");
  $get->execute([(int)$u['id']]);
  $row = $get->fetch();

  if (!$row) fail('Profile not found after update', 404);

  // ★ Update session / auth cached user to prevent rollback on next request
  $_SESSION['user'] = array_merge($u, [
    'name'           => $row['name'],
    'preferred_name' => $row['preferred_name'],
    'pronouns'       => $row['pronouns'],
    'academic_year'  => $row['academic_year'],
    'major'          => $row['major'],
    'avatar_seed'    => $row['avatar_seed'], // ★ critical
  ]);

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
      'role' => $row['role'],
      'avatar_seed' => $row['avatar_seed'], // ★ returned to frontend
    ],
  ]);

} catch (Throwable $e) {
  error_log("Profile update error: {$e->getMessage()}\nSQL: " . ($sql ?? 'N/A'));
  http_response_code(500);
  echo json_encode(['ok'=>false,'message'=>'Server error']);
}
