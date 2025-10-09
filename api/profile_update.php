<?php
// profile_update.php — update only provided profile fields

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
if (!$u) {
  http_response_code(401);
  echo json_encode(['ok'=>false,'message'=>'Not signed in']);
  exit;
}

// Read JSON body (use your existing helper from db.php)
$in = read_json();  // you previously used read_json(); json_body() wasn't defined

// Whitelist of fields we allow to update -> db column names
$fields = [
  'name'                => 'name',
  'preferred_name'      => 'preferred_name',
  'pronouns'            => 'pronouns',
  'academic_year'       => 'academic_year',
  'major'               => 'major',
  'disabilities'        => 'disabilities',
  'title'               => 'title',
  'title_display_order' => 'title_display_order',
];

// Build dynamic SET only for keys present in the input
$set  = [];
$args = [];

foreach ($fields as $jsonKey => $col) {
  if (array_key_exists($jsonKey, $in)) {
    // Empty string -> NULL (keeps your earlier behavior)
    $val = ($in[$jsonKey] === '' ? null : $in[$jsonKey]);

    // Optional: cast numeric for display order
    if ($jsonKey === 'title_display_order' && $val !== null) {
      $val = (int)$val;
    }

    $set[]  = "`$col` = ?";
    $args[] = $val;
  }
}

if (!$set) {
  echo json_encode(['ok'=>true, 'message'=>'No changes']);
  exit;
}

// Execute update
try {
  $pdo = pdo();
  // make sure errors throw
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);

  $args[] = (int)$u['id'];
  $sql = "UPDATE users SET " . implode(', ', $set) . " WHERE id = ?";
  $stmt = $pdo->prepare($sql);
  $stmt->execute($args);

  echo json_encode(['ok'=>true, 'rows'=>$stmt->rowCount()]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false, 'message'=>'DB error', 'error'=>$e->getMessage()]);
}
