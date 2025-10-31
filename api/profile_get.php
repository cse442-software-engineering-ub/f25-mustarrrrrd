<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

header('Content-Type: application/json');

// CORS (with whitelist validation)
set_cors_headers();

// Must be signed in
$u = current_user();
if (!$u) {
  http_response_code(401);
  echo json_encode(['ok'=>false,'message'=>'Not signed in']);
  exit;
}

echo json_encode([
  'ok' => true,
  'profile' => [
    'name' => $u['name'],
    'preferred_name' => $u['preferred_name'],
    'email' => $u['email'],
    'pronouns' => $u['pronouns'],
    'academic_year' => $u['academic_year'],
    'major' => $u['major'],
    'disabilities' => $u['disabilities'],
    'title' => $u['title'],
    'title_display_order' => $u['title_display_order'],
    'role' => $u['role'], // already 'professor' in DB
  ],
]);
