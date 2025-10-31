<?php
// /api/avatar_upload.php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

header('Content-Type: application/json');
// CORS (with whitelist validation)
set_cors_headers();
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  exit;
}

$u = current_user();
if (!$u) { http_response_code(401); echo json_encode(['ok'=>false,'message'=>'Not signed in']); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false,'message'=>'Use POST']); exit; }

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
  http_response_code(400);
  echo json_encode(['ok'=>false,'message'=>'No file uploaded or upload error']);
  exit;
}

// Validate size (<= 3 MB)
$maxBytes = 3 * 1024 * 1024;
if ($_FILES['file']['size'] > $maxBytes) {
  http_response_code(413);
  echo json_encode(['ok'=>false,'message'=>'File too large (max 3MB)']);
  exit;
}

// Validate type using finfo
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime  = $finfo->file($_FILES['file']['tmp_name']) ?: 'application/octet-stream';
$allowed = [
  'image/jpeg' => 'jpg',
  'image/png'  => 'png',
  'image/webp' => 'webp',
];
if (!isset($allowed[$mime])) {
  http_response_code(415);
  echo json_encode(['ok'=>false,'message'=>'Unsupported type (use JPG/PNG/WEBP)']);
  exit;
}
$ext = $allowed[$mime];

$destDir = __DIR__ . '/uploads/avatars';
if (!is_dir($destDir)) {
  @mkdir($destDir, 0775, true);
}

// Clean older formats for this user
$uid = (int)$u['id'];
foreach (['webp','jpg','jpeg','png'] as $oldExt) {
  $old = "$destDir/$uid.$oldExt";
  if (is_file($old)) @unlink($old);
}

$dest = "$destDir/$uid.$ext";
if (!move_uploaded_file($_FILES['file']['tmp_name'], $dest)) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'message'=>'Failed to save file']);
  exit;
}

// Touch file to bump mtime for caching
@touch($dest);

echo json_encode([
  'ok' => true,
  'url' => "avatar.php?uid=$uid&t=" . time(), // cache-bust
]);
