<?php
// api/dev_dummy_login.php
declare(strict_types=1);
require __DIR__ . '/db.php';

// --- DEV ONLY: enable only on localhost ---
if (!in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)) {
  http_response_code(403);
  echo json_encode(['ok'=>false,'message'=>'Forbidden']);
  exit;
}

// Dummy account data
$dummy = [
  'name'  => 'Demo Student',
  'email' => 'demo.student@buffalo.edu',
  // Hash the password 'password' using bcrypt
  'password_hash' => password_hash('password', PASSWORD_DEFAULT),
  'role'  => 'student',
  'preferred_name' => 'Demo',
  'pronouns' => 'they/them',
  'academic_year' => 'Senior',
  'major' => 'Computer Science',
  'disabilities' => null,
  'title' => null,
  'title_display_order' => 'title-first',
];

// Upsert user
$pdo = pdo();
$pdo->beginTransaction();

$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$dummy['email']]);
$uid = $stmt->fetchColumn();

if ($uid) {
  // update core fields in case table already existed with fewer cols
  $upd = $pdo->prepare('UPDATE users SET name=?, password_hash=?, role=? WHERE id=?');
  $upd->execute([$dummy['name'], $dummy['password_hash'], $dummy['role'], $uid]);

  // optional profile fields (ignore errors if cols don’t exist)
  try {
    $upd2 = $pdo->prepare('UPDATE users
      SET preferred_name=?, pronouns=?, academic_year=?, major=?, disabilities=?, title=?, title_display_order=?
      WHERE id=?');
    $upd2->execute([
      $dummy['preferred_name'], $dummy['pronouns'], $dummy['academic_year'], $dummy['major'],
      $dummy['disabilities'], $dummy['title'], $dummy['title_display_order'], $uid
    ]);
  } catch (Throwable $e) { /* noop for missing columns */ }
} else {
  $ins = $pdo->prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
  $ins->execute([$dummy['name'], $dummy['email'], $dummy['password_hash'], $dummy['role']]);
  $uid = (int)$pdo->lastInsertId();

  // optional profile fields
  try {
    $upd2 = $pdo->prepare('UPDATE users
      SET preferred_name=?, pronouns=?, academic_year=?, major=?, title_display_order=?
      WHERE id=?');
    $upd2->execute([$dummy['preferred_name'], $dummy['pronouns'], $dummy['academic_year'], $dummy['major'],
      $dummy['title_display_order'], $uid]);
  } catch (Throwable $e) { /* noop */ }
}

// Set a fresh session token and cookie
$token = bin2hex(random_bytes(16));
$updTok = $pdo->prepare('UPDATE users SET session_token=? WHERE id=?');
$updTok->execute([$token, $uid]);
$pdo->commit();

setcookie('session_token', $token, [
  'expires'  => time() + 60*60, // 1 hour
  'path'     => '/',
  'secure'   => false,           // true under https
  'httponly' => true,
  'samesite' => 'Lax',
]);

echo json_encode(['ok'=>true, 'id'=>$uid, 'email'=>$dummy['email']]);