<?php
// admin/user_delete.php — Permanently delete user (use with caution)
require_once __DIR__ . '/../_shared.php';
require_once __DIR__ . '/../admin_auth.php';
set_cors_headers();
sess_start();


$admin = require_admin();
$pdo = pdo();

$data = read_json();

$user_id = (int) ($data['id'] ?? 0);

if (!$user_id) {
    http_response_code(400);
    echo json_encode(['error' => 'User ID required']);
    exit;
}

// Check if user exists
$check_stmt = $pdo->prepare('SELECT id, email, name FROM users WHERE id = ? LIMIT 1');
$check_stmt->execute([$user_id]);
$existing_user = $check_stmt->fetch(PDO::FETCH_ASSOC);

if (!$existing_user) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found']);
    exit;
}

// Prevent self-deletion
if ($user_id === (int) $admin['id']) {
    http_response_code(400);
    echo json_encode(['error' => 'Cannot delete your own account']);
    exit;
}

// Log the action before deletion
try {
    log_admin_action(
        $pdo,
        (int) $admin['id'],
        'delete_user',
        'user',
        $user_id,
        [
            'email' => $existing_user['email'],
            'name' => $existing_user['name']
        ]
    );
} catch (Exception $e) {
    // Continue even if logging fails
    error_log("Audit log failed: " . $e->getMessage());
}

// Delete user (cascades to enrollments, favorites, sessions, etc.)
$stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
$stmt->execute([$user_id]);

echo json_encode([
    'success' => true,
    'message' => 'User permanently deleted'
]);
