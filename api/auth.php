<?php
// auth.php — remember-me helpers & current_user()
// depends on pdo(), clamp191(), read_json() from db.php

const REMEMBER_COOKIE = 'remember_token';
const REMEMBER_DAYS   = 30;

function base64url_encode_auth($b) {
  return rtrim(strtr(base64_encode($b), '+/', '-_'), '=');
}
function new_remember_raw() { return base64url_encode_auth(random_bytes(32)); }
function remember_hash($raw) { return hash('sha256', $raw); } // 64 hex

function set_remember_cookie($raw) {
  $opts = [
    'expires'  => time() + REMEMBER_DAYS*24*60*60,
    'path'     => '/',
    'domain'   => '', // set your domain if needed
    'secure'   => !empty($_SERVER['HTTPS']),
    'httponly' => true,
    'samesite' => 'Lax',
  ];
  setcookie(REMEMBER_COOKIE, $raw, $opts);
}

function clear_remember_cookie() {
  $opts = [
    'expires'  => time() - 3600,
    'path'     => '/',
    'domain'   => '',
    'secure'   => !empty($_SERVER['HTTPS']),
    'httponly' => true,
    'samesite' => 'Lax',
  ];
  setcookie(REMEMBER_COOKIE, '', $opts);
}

function issue_persistent_login(PDO $pdo, int $user_id) {
  $raw  = new_remember_raw();
  $hash = remember_hash($raw);
  $pdo->prepare('UPDATE users SET session_token = ? WHERE id = ?')->execute([$hash, $user_id]);
  set_remember_cookie($raw);
}

function destroy_persistent_login(PDO $pdo, int $user_id) {
  $pdo->prepare('UPDATE users SET session_token = NULL WHERE id = ?')->execute([$user_id]);
  clear_remember_cookie();
}

/**
 * current_user():
 *   1) If PHP session exists, return that user.
 *   2) Else, verify remember cookie -> hash -> DB lookup, rebuild session, return user.
 */
function current_user() {
  if (session_status() !== PHP_SESSION_ACTIVE) session_start();

  if (!empty($_SESSION['user_id'])) {
    $pdo = pdo();
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$_SESSION['user_id']]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);
    return $u ?: null;
  }

  if (!empty($_COOKIE[REMEMBER_COOKIE])) {
    $raw  = $_COOKIE[REMEMBER_COOKIE];
    $hash = remember_hash($raw);

    $pdo = pdo();
    $stmt = $pdo->prepare('SELECT * FROM users WHERE session_token = ? LIMIT 1');
    $stmt->execute([$hash]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($u) {
      session_regenerate_id(true);
      $_SESSION['user_id'] = (int)$u['id'];
      $_SESSION['email']   = $u['email'];
      $_SESSION['name']    = $u['name'];
      $_SESSION['role']    = $u['role'];
      return $u;
    }
  }

  return null;
}
