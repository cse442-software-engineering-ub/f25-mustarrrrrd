<?php
// admin_auth.php — Admin authentication and authorization helpers
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db.php';

/**
 * Require admin authentication
 * Checks if current user has admin role, returns user or exits with 403
 */
function require_admin() {
    $user = current_user();

    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentication required']);
        exit;
    }

    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Admin access required']);
        exit;
    }

    return $user;
}

/**
 * Check if user is admin (without exiting)
 */
function is_admin() {
    $user = current_user();
    return $user && $user['role'] === 'admin';
}

/**
 * Log admin action to audit log
 */
function log_admin_action(
    PDO $pdo,
    int $admin_user_id,
    string $action_type,
    string $target_type,
    ?int $target_id = null,
    ?array $details = null
) {
    $ip_address = $_SERVER['REMOTE_ADDR'] ?? null;
    $details_json = $details ? json_encode($details) : null;

    $stmt = $pdo->prepare('
        INSERT INTO audit_logs
        (admin_user_id, action_type, target_type, target_id, details, ip_address)
        VALUES (?, ?, ?, ?, ?, ?)
    ');

    $stmt->execute([
        $admin_user_id,
        $action_type,
        $target_type,
        $target_id,
        $details_json,
        $ip_address
    ]);
}

/**
 * Get audit logs with pagination and filtering
 */
function get_audit_logs(
    PDO $pdo,
    ?int $admin_user_id = null,
    ?string $action_type = null,
    ?string $target_type = null,
    int $limit = 50,
    int $offset = 0
) {
    $where = [];
    $params = [];

    if ($admin_user_id) {
        $where[] = 'admin_user_id = ?';
        $params[] = $admin_user_id;
    }

    if ($action_type) {
        $where[] = 'action_type = ?';
        $params[] = $action_type;
    }

    if ($target_type) {
        $where[] = 'target_type = ?';
        $params[] = $target_type;
    }

    $where_sql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $stmt = $pdo->prepare("
        SELECT
            al.*,
            u.name as admin_name,
            u.email as admin_email
        FROM audit_logs al
        LEFT JOIN users u ON al.admin_user_id = u.id
        $where_sql
        ORDER BY al.created_at DESC
        LIMIT ? OFFSET ?
    ");

    $params[] = $limit;
    $params[] = $offset;

    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}
