<?php
// /api/avatar.php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

// Allow public read (no CORS creds needed for an <img>, but OK to reflect origin)
if (isset($_SERVER['HTTP_ORIGIN'])) {
  header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
}

$uid = isset($_GET['uid']) ? (int)$_GET['uid'] : 0;
if ($uid <= 0) {
  http_response_code(404);
  exit;
}

$base = __DIR__ . '/uploads/avatars';
$paths = [
  "$base/$uid.webp" => 'image/webp',
  "$base/$uid.jpg"  => 'image/jpeg',
  "$base/$uid.jpeg" => 'image/jpeg',
  "$base/$uid.png"  => 'image/png',
];

$file = null; $type = null;
foreach ($paths as $p => $t) {
  if (is_file($p)) { $file = $p; $type = $t; break; }
}

// Tiny fallback SVG (initials not computed here for simplicity)
if (!$file) {
  header('Content-Type: image/svg+xml');
  header('Cache-Control: public, max-age=86400');
  echo '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="100%" height="100%" fill="#222"/><text x="50%" y="54%" text-anchor="middle" font-family="system-ui" font-size="92" fill="#777">🙂</text></svg>';
  exit;
}

// Cache headers
$mtime = filemtime($file) ?: time();
$etag = '"' . md5($file . $mtime) . '"';
header('ETag: ' . $etag);
header('Cache-Control: private, max-age=86400');

if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && trim($_SERVER['HTTP_IF_NONE_MATCH']) === $etag) {
  http_response_code(304);
  exit;
}

header('Content-Type: ' . $type);
readfile($file);
