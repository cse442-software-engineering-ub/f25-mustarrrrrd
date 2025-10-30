<?php
declare(strict_types=1);
require_once __DIR__ . '/_shared.php';
require_once __DIR__ . '/auth.php';

json_headers();
sess_start();
$u = current_user();
if (!$u) {
  out(401, ['ok'=>false,'error'=>'not_logged_in']);
  exit;
}

$pdo = pdo_or_die();
$body = json_decode(file_get_contents('php://input'), true);
if (!$body) {
  out(400, ['ok'=>false,'error'=>'missing_subscription']);
  exit;
}

$stmt = $pdo->prepare("UPDATE users SET push_sub = ? WHERE email = ?");
$stmt->execute([json_encode($body), $u['email']]);

out(200, ['ok'=>true]);
