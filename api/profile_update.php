<?php
require __DIR__ . '/db.php';

$u = current_user();
if (!$u) { http_response_code(401); echo json_encode(['ok'=>false,'message'=>'Not signed in']); exit; }

$in = json_body();

$fields = [
  'name'               => 'name',
  'preferred_name'     => 'preferred_name',
  'pronouns'           => 'pronouns',
  'academic_year'      => 'academic_year',
  'major'              => 'major',
  'disabilities'       => 'disabilities',
  'title'              => 'title',
  'title_display_order'=> 'title_display_order',
];

// Build dynamic update of only provided fields
$set = [];
$args = [];
foreach ($fields as $k => $col) {
  if (array_key_exists($k, $in)) {
    $set[] = "`$col` = ?";
    $args[] = ($in[$k] === '' ? null : $in[$k]);
  }
}

if (!$set) { echo json_encode(['ok'=>true]); exit; }

$args[] = $u['id'];
$sql = "UPDATE users SET " . implode(', ', $set) . " WHERE id = ?";
$stmt = pdo()->prepare($sql);
$stmt->execute($args);

echo json_encode(['ok'=>true]);
