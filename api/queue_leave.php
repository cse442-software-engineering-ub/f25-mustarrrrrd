<?php
declare(strict_types=1);

// Hard no-cache (helps on university proxies)
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

require_once __DIR__ . '/db.php';

function out(int $code, array $payload): void {
  http_response_code($code);
  echo json_encode($payload);
  exit;
}

if (session_status() !== PHP_SESSION_ACTIVE) {
  session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',   // share across /app or /auto_oh and /api
    'domain'   => '',
    'secure'   => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
    'httponly' => true,
    'samesite' => 'Lax',
  ]);
  session_start();
}

try {
  $pdo = pdo();

  // Accept body JSON or form/query; fallback to session email
  $in        = json_decode(file_get_contents('php://input'), true) ?: [];
  $courseKey = $in['course_id']  ?? $_POST['course_id']  ?? $_GET['course_id']  ?? null;
  $email     = $in['user_email'] ?? $_POST['user_email'] ?? $_GET['user_email'] ?? ($_SESSION['email'] ?? null);
  $sessionId = isset($in['session_id']) ? (ctype_digit((string)$in['session_id']) ? (int)$in['session_id'] : null) : (isset($_POST['session_id']) && ctype_digit((string)$_POST['session_id']) ? (int)$_POST['session_id'] : (isset($_GET['session_id']) && ctype_digit((string)$_GET['session_id']) ? (int)$_GET['session_id'] : null));

  if (!$courseKey && !$sessionId) out(400, ['ok'=>false, 'error'=>'Missing course_id_or_session_id']);
  if (!$email)     out(400, ['ok'=>false, 'error'=>'Missing user_email']);

  // Normalize course id (accepts numeric id or code) only when provided
  $cid = null;
  if ($courseKey) {
    if (ctype_digit((string)$courseKey)) {
      $cid = (int)$courseKey;
    } else {
      $q = $pdo->prepare('SELECT id FROM courses WHERE code = ? LIMIT 1');
      $q->execute([trim((string)$courseKey)]);
      $cid = (int)$q->fetchColumn();
      if (!$cid) out(400, ['ok'=>false, 'error'=>'Unknown course']);
    }
  }

  // Mark the active row as left (only if it’s currently active)
  if ($sessionId) {
    $upd = $pdo->prepare(
      "UPDATE queue_entries
          SET left_at = IF(left_at IS NULL, NOW(), left_at), notes = ''
        WHERE session_id = ? AND user_email = ? AND left_at IS NULL"
    );
    $upd->execute([$sessionId, $email]);
  } else {
    $upd = $pdo->prepare(
      "UPDATE queue_entries
          SET left_at = IF(left_at IS NULL, NOW(), left_at), notes = ''
        WHERE course_id = ? AND user_email = ? AND left_at IS NULL"
    );
    $upd->execute([$cid, $email]);
  }

  // Return fresh totals so caller can update immediately if needed
  if ($sessionId) {
    $tot = $pdo->prepare('SELECT COUNT(*) FROM queue_entries WHERE session_id = ? AND left_at IS NULL');
    $tot->execute([$sessionId]);
  } else {
    $tot = $pdo->prepare('SELECT COUNT(*) FROM queue_entries WHERE course_id = ? AND left_at IS NULL');
    $tot->execute([$cid]);
  }
  $total = (int)$tot->fetchColumn();

  out(200, ['ok'=>true, 'updated'=>$upd->rowCount(), 'total'=>$total]);
} catch (Throwable $e) {
  out(500, ['ok'=>false, 'error'=>$e->getMessage()]);
}
