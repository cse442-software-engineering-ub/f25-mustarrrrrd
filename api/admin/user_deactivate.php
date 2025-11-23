<?php
// admin/user_deactivate.php — Deactivate/reactivate user account
require_once __DIR__ . '/../_shared.php';
require_once __DIR__ . '/../admin_auth.php';
set_cors_headers();
sess_start();


$admin = require_admin();
$pdo = pdo();

$data = read_json();

$user_id = (int)($data['id'] ?? 0);
$is_active = (int)($data['is_active'] ?? 1);

if (!$user_id) {
    http_response_code(400);
    echo json_encode(['error' => 'User ID required']);
    exit;
}

// Check if user exists
$check_stmt = $pdo->prepare('SELECT id, email, is_active FROM users WHERE id = ? LIMIT 1');
$check_stmt->execute([$user_id]);
$existing_user = $check_stmt->fetch(PDO::FETCH_ASSOC);

if (!$existing_user) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found']);
    exit;
}

// Prevent self-deactivation
if ($user_id === (int)$admin['id'] && !$is_active) {
    http_response_code(400);
    echo json_encode(['error' => 'Cannot deactivate your own account']);
    exit;
}

// Update user status
$deactivated_at = $is_active ? null : date('Y-m-d H:i:s');
$stmt = $pdo->prepare('UPDATE users SET is_active = ?, deactivated_at = ? WHERE id = ?');
$stmt->execute([$is_active, $deactivated_at, $user_id]);

// Clear session token if deactivating
if (!$is_active) {
    $pdo->prepare('UPDATE users SET session_token = NULL WHERE id = ?')->execute([$user_id]);
}

// Log the action
log_admin_action(
    $pdo,
    (int)$admin['id'],
    $is_active ? 'reactivate_user' : 'deactivate_user',
    'user',
    $user_id,
    ['email' => $existing_user['email']]
);

echo json_encode([
    'success' => true,
    'message' => $is_active ? 'User reactivated' : 'User deactivated',
    'is_active' => (bool)$is_active
]);
