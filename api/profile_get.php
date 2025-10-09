<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

header('Content-Type: application/json');
if (isset($_SERVER['HTTP_ORIGIN'])) {
  header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
  header('Access-Control-Allow-Credentials: true');
}

$u = current_user();
if (!$u) {
  http_response_code(401);
  echo json_encode(['ok'=>false,'message'=>'Not signed in']);
  exit;
}

echo json_encode([
  'ok' => true,
  'profile' => [
    'id' => (int)$u['id'], // <— add this
    'name' => $u['name'],
    'preferred_name' => $u['preferred_name'],
    'email' => $u['email'],
    'pronouns' => $u['pronouns'],
    'academic_year' => $u['academic_year'],
    'major' => $u['major'],
    'disabilities' => $u['disabilities'],
    'title' => $u['title'],
    'title_display_order' => $u['title_display_order'],
    'role' => ($u['role'] === 'instructor' ? 'professor' : $u['role']),
  ],
]);
