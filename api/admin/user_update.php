<?php
// admin/user_update.php — Update user information
require_once __DIR__ . '/../_shared.php';
require_once __DIR__ . '/../admin_auth.php';
set_cors_headers();
sess_start();


$admin = require_admin();
$pdo = pdo();

$data = read_json();

$user_id = (int)($data['id'] ?? 0);

if (!$user_id) {
    http_response_code(400);
    echo json_encode(['error' => 'User ID required']);
    exit;
}

// Check if user exists
$check_stmt = $pdo->prepare('SELECT id, email FROM users WHERE id = ? LIMIT 1');
$check_stmt->execute([$user_id]);
$existing_user = $check_stmt->fetch(PDO::FETCH_ASSOC);

if (!$existing_user) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found']);
    exit;
}

// Build update fields
$updates = [];
$params = [];

if (isset($data['name'])) {
    $updates[] = 'name = ?';
    $params[] = $data['name'];
}

if (isset($data['preferred_name'])) {
    $updates[] = 'preferred_name = ?';
    $params[] = $data['preferred_name'] ?: null;
}

if (isset($data['email'])) {
    $updates[] = 'email = ?';
    $params[] = $data['email'];
}

if (isset($data['role']) && in_array($data['role'], ['student', 'ta', 'professor', 'admin'])) {
    $updates[] = 'role = ?';
    $params[] = $data['role'];
}

if (isset($data['pronouns'])) {
    $updates[] = 'pronouns = ?';
    $params[] = $data['pronouns'] ?: null;
}

if (isset($data['academic_year'])) {
    $valid_years = ['Freshman', 'Sophomore', 'Junior', 'Senior'];
    $updates[] = 'academic_year = ?';
    $params[] = in_array($data['academic_year'], $valid_years) ? $data['academic_year'] : null;
}

if (isset($data['major'])) {
    $updates[] = 'major = ?';
    $params[] = $data['major'] ?: null;
}

if (isset($data['title'])) {
    $updates[] = 'title = ?';
    $params[] = $data['title'] ?: null;
}

if (!$updates) {
    http_response_code(400);
    echo json_encode(['error' => 'No fields to update']);
    exit;
}

// Add user_id to params
$params[] = $user_id;

// Update user
$sql = 'UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = ?';
$stmt = $pdo->prepare($sql);
$stmt->execute($params);

// Log the action
$details = array_filter([
    'updated_fields' => array_keys($data),
    'old_email' => $existing_user['email']
]);

log_admin_action(
    $pdo,
    (int)$admin['id'],
    'update_user',
    'user',
    $user_id,
    $details
);

// Return updated user
$updated_stmt = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
$updated_stmt->execute([$user_id]);
$updated_user = $updated_stmt->fetch(PDO::FETCH_ASSOC);

// Remove sensitive data
unset($updated_user['password_hash'], $updated_user['session_token']);

echo json_encode(['success' => true, 'user' => $updated_user]);
