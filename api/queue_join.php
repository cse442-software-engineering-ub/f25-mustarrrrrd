<?php
declare(strict_types=1);

/* ---- debug + no-cache (safe for localhost) ---- */
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
ini_set('display_errors','1');
error_reporting(E_ALL);

require_once __DIR__ . '/db.php';
if (session_status() !== PHP_SESSION_ACTIVE) { @session_start(); }

function out(int $code, array $payload) {
  http_response_code($code);
  echo json_encode($payload);
  exit;
}
function canonical_course_id(PDO $pdo, $key): int {
  if ($key === null || $key === '') throw new Exception('Missing course_id');
  $raw = trim((string)$key);

  if (ctype_digit($raw)) return (int)$raw;

  // exact code
  $q = $pdo->prepare('SELECT id FROM courses WHERE code = ? LIMIT 1');
  $q->execute([$raw]);
  $id = $q->fetchColumn();
  if ($id) return (int)$id;

  // forgiving match (case/space)
  $q = $pdo->prepare('SELECT id FROM courses WHERE UPPER(TRIM(code)) = UPPER(?) LIMIT 1');
  $q->execute([$raw]);
  $id = $q->fetchColumn();
  if ($id) return (int)$id;

  $dbName = $pdo->query('SELECT DATABASE()')->fetchColumn();
  throw new Exception("Unknown course identifier '$raw' (db=$dbName)");
}

try {
  $pdo = pdo();

  // read JSON or form/query; prefer JSON
  $in        = json_decode(file_get_contents('php://input'), true) ?: [];
  $courseKey = $in['course_id']   ?? $_POST['course_id']   ?? $_GET['course_id']   ?? null;
  $email     = $in['user_email']  ?? $in['email']          ?? $_POST['user_email'] ?? $_GET['user_email'] ?? ($_SESSION['email'] ?? null);
  $notes     = clamp191($in['notes'] ?? $_POST['notes'] ?? $_GET['notes'] ?? '');

  if (!$email) throw new Exception('Missing user_email');
  $courseId = canonical_course_id($pdo, $courseKey);

  /* 1) Already active? → idempotent */
  $chk = $pdo->prepare('SELECT id FROM queue_entries WHERE course_id=? AND user_email=? AND left_at IS NULL LIMIT 1');
  $chk->execute([$courseId, $email]);
  $activeId = $chk->fetchColumn();
  if ($activeId) {
    // optionally update notes on the active row
    $upd = $pdo->prepare('UPDATE queue_entries SET notes=? WHERE id=?');
    $upd->execute([$notes, $activeId]);
  } else {
    /* 2) Reactivate last historical row (unique (course_id,user_email) prevents a fresh insert) */
    // MySQL supports ORDER BY + LIMIT in UPDATE
    $react = $pdo->prepare(
      'UPDATE queue_entries
         SET left_at = NULL, joined_at = NOW(), notes = ?
       WHERE course_id = ? AND user_email = ? AND left_at IS NOT NULL
       ORDER BY joined_at DESC
       LIMIT 1'
    );
    $react->execute([$notes, $courseId, $email]);

    if ($react->rowCount() === 0) {
      /* 3) No historical row → safe to insert (unique key allows it) */
      $ins = $pdo->prepare(
        'INSERT INTO queue_entries (course_id, user_email, notes, joined_at)
         VALUES (?, ?, ?, NOW())'
      );
      $ins->execute([$courseId, $email, $notes]);
    }
  }

  // return quick status
  $tot = $pdo->prepare('SELECT COUNT(*) FROM queue_entries WHERE course_id=? AND left_at IS NULL');
  $tot->execute([$courseId]);
  $total = (int)$tot->fetchColumn();

  $pos = null;
  $j = $pdo->prepare(
    'SELECT joined_at FROM queue_entries
     WHERE course_id=? AND user_email=? AND left_at IS NULL
     ORDER BY joined_at ASC LIMIT 1'
  );
  $j->execute([$courseId, $email]);
  if ($ja = $j->fetchColumn()) {
    $pc = $pdo->prepare(
      'SELECT COUNT(*) FROM queue_entries
       WHERE course_id=? AND left_at IS NULL AND joined_at <= ?'
    );
    $pc->execute([$courseId, $ja]);
    $pos = (int)$pc->fetchColumn();
  }

  out(200, ['ok'=>true, 'total'=>$total, 'position'=>$pos, 'status'=>'Active']);
} catch (Throwable $e) {
  error_log('QUEUE_JOIN exception: '.$e->getMessage());
  out(500, ['ok'=>false, 'error'=>$e->getMessage()]);
}
