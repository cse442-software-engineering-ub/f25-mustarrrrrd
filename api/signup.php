<?php
// /api/signup.php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

function fail($code, $msg, $http = 400) {
  http_response_code($http);
  echo json_encode(['ok' => false, 'code' => $code, 'message' => $msg]);
  exit;
}

try {
  $b = read_json();
  $first = isset($b['firstName']) ? trim($b['firstName']) : '';
  $last  = isset($b['lastName'])  ? trim($b['lastName'])  : '';
  $email = isset($b['email'])     ? clamp191($b['email']) : '';
  $pass1 = (string)($b['password'] ?? '');
  $pass2 = (string)($b['confirmPassword'] ?? '');
  $role  = isset($b['role']) ? trim($b['role']) : '';

  if ($first === '' || $last === '' || $email === '' || $pass1 === '' || $pass2 === '' || $role === '') {
    fail('missing_fields', 'All fields are required.');
  }
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fail('invalid_email', 'Enter a valid email address.');
  }
  if ($pass1 !== $pass2) {
    fail('password_mismatch', 'Passwords do not match.');
  }

  // Map frontend "professor" to DB enum "instructor"
  if ($role === 'professor') $role = 'instructor';
  if (!in_array($role, ['student','ta','instructor'], true)) {
    fail('invalid_role', 'Role must be student, ta, or instructor.');
  }

  $pdo = pdo();

  // Email unique
  $q = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
  $q->execute([$email]);
  if ($q->fetch()) {
    fail('email_taken', 'Email already in use.', 409);
  }

  // Hash the password using bcrypt
  $name  = clamp191($first . ' ' . $last);
  $hashed_password = password_hash($pass1, PASSWORD_DEFAULT);

  $ins = $pdo->prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
  $ins->execute([$name, $email, $hashed_password, $role]);

  // Auto-login + remember-me (optional; enabled here)
  session_start();
  session_regenerate_id(true);

  $user_id = (int)$pdo->lastInsertId();
  $_SESSION['user_id'] = $user_id;
  $_SESSION['email']   = $email;
  $_SESSION['name']    = $name;
  $_SESSION['role']    = $role;

  // Set remember cookie + store hash
  issue_persistent_login($pdo, $user_id);

  http_response_code(201);
  echo json_encode([
    'ok' => true,
    'user' => [
      'id' => $user_id,
      'name' => $name,
      'email' => $email,
      'role' => ($role === 'instructor' ? 'professor' : $role),
      'created_at' => date('c'),
    ]
  ]);
} catch (Throwable $e) {
  // Uncomment while debugging:
  // fail('server_error', $e->getMessage(), 500);
  fail('server_error', 'Unexpected error. Try again later.', 500);
}
