<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

header('Content-Type: application/json');
if (isset($_SERVER['HTTP_ORIGIN'])) {
  header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
  header('Access-Control-Allow-Credentials: true');
}

// Must be signed in
$u = current_user();
if (!$u) {
  http_response_code(401);
  echo json_encode(['ok'=>false,'message'=>'Not signed in']);
  exit;
}

// Build avatar_url if avatar_filename exists
$fname = $u['avatar_filename'] ?? null;
$avatar_url = null;
if ($fname) {
  // e.g. /f25-mustarrrrrd/api  →  /f25-mustarrrrrd/uploads/avatars/<fname>
  $base = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
  $avatar_url = preg_replace('#/+#','/', $base . '/../uploads/avatars/' . $fname);
}

echo json_encode([
  'ok' => true,
  'profile' => [
    'id'                 => (int)$u['id'],
    'name'               => $u['name'],
    'preferred_name'     => $u['preferred_name'],
    'email'              => $u['email'],
    'pronouns'           => $u['pronouns'],
    'academic_year'      => $u['academic_year'],
    'major'              => $u['major'],
    'disabilities'       => $u['disabilities'],
    'title'              => $u['title'],
    'title_display_order'=> $u['title_display_order'],
    'role'               => ($u['role'] === 'instructor' ? 'professor' : $u['role']),
    'avatar_filename'    => $fname,
    'avatar_url'         => $avatar_url,
  ],
]);
