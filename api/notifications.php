<?php
require_once __DIR__ . '/_shared.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

header('Content-Type: application/json');
set_cors_headers();
sess_start();

$u = current_user();
if (!$u) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'not_logged_in']); exit; }

try { $pdo = pdo(); }
catch (Throwable $e) { http_response_code(500); echo json_encode(['ok'=>false,'error'=>'db']); exit; }

$method = $_SERVER['REQUEST_METHOD'];
$email  = $u['email'] ?? null;

try {
  // Prefer 'notifications' table; fallback to 'user_notifications'
  $table = 'notifications';
  try { $pdo->query("SELECT 1 FROM {$table} LIMIT 1"); }
  catch (Throwable $e) { $table = 'user_notifications'; }

  // Validate table name against allowlist
  $table = validate_table_name($table, ['notifications', 'user_notifications']);

  if ($method === 'GET') {
    $stmt = $pdo->prepare("SELECT id, notif_type, message, created_at
                           FROM {$table}
                           WHERE user_email = ? AND seen = 0
                           ORDER BY created_at DESC
                           LIMIT 10");
    $stmt->execute([$email]);
    echo json_encode(['ok'=>true, 'notifications'=>$stmt->fetchAll(PDO::FETCH_ASSOC)]); exit;
  }

  if ($method === 'POST') {
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $id = isset($in['id']) ? (int)$in['id'] : 0;
    if ($id <= 0) { echo json_encode(['ok'=>false,'error'=>'missing_id']); exit; }
    $u2 = $pdo->prepare("UPDATE {$table} SET seen = 1 WHERE id = ? AND user_email = ?");
    $u2->execute([$id, $email]);
    echo json_encode(['ok'=>true, 'updated'=>$u2->rowCount()]); exit;
  }

  echo json_encode(['ok'=>false,'error'=>'unsupported_method']);
} catch (Throwable $e) {
  error_log('Notifications error: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>'Server error']);
}
