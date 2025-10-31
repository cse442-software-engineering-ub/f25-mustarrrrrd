<?php
declare(strict_types=1);

require_once __DIR__ . '/_shared.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db.php';

json_headers();
sess_start();

$u = current_user();
if (!$u) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'not_logged_in']); exit; }

try { $pdo = pdo(); }
catch (Throwable $e) { http_response_code(500); echo json_encode(['ok'=>false,'error'=>'db_connect']); exit; }

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  // only show unseen absent notifications for this user
  $type = $_GET['type'] ?? '';
  $wantAbsent = ($type === 'absent_removed');

  // Table shape from your screenshot:
  // user_notifications(id, user_email, notif_type, message, created_at, seen)
  $sql =
    "SELECT id, user_email, notif_type, message, created_at, seen
       FROM user_notifications
      WHERE user_email = ? AND seen = 0" .
      ($wantAbsent ? " AND notif_type = 'absent_removed'" : "") .
    " ORDER BY created_at DESC LIMIT 10";

  $stmt = $pdo->prepare($sql);
  $stmt->execute([$u['email'] ?? '']);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
  echo json_encode(['ok'=>true,'notifications'=>$rows]); exit;
}

if ($method === 'POST') {
  // mark one as seen
  $in = json_decode(file_get_contents('php://input'), true) ?: [];
  $id = isset($in['id']) ? (int)$in['id'] : 0;
  if ($id <= 0) { echo json_encode(['ok'=>false,'error'=>'missing_id']); exit; }

  $u2 = $pdo->prepare("UPDATE user_notifications SET seen = 1 WHERE id = ? AND user_email = ?");
  $u2->execute([$id, $u['email'] ?? '']);
  echo json_encode(['ok'=>true,'updated'=>$u2->rowCount()]); exit;
}

// method not allowed
http_response_code(405);
echo json_encode(['ok'=>false,'error'=>'method_not_allowed']);
