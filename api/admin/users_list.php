<?php
// admin/users_list.php — List all users with filtering and pagination
require_once __DIR__ . '/../_shared.php';
require_once __DIR__ . '/../admin_auth.php';

set_cors_headers();
sess_start();

$admin = require_admin();
$pdo = pdo();

// Get query parameters
$role = $_GET['role'] ?? null;
$is_active = isset($_GET['is_active']) ? (int)$_GET['is_active'] : null;
$search = $_GET['search'] ?? null;
$sort_by = $_GET['sort_by'] ?? 'created_at';
$sort_order = strtoupper($_GET['sort_order'] ?? 'DESC');
$limit = min((int)($_GET['limit'] ?? 50), 100); // Max 100
$offset = (int)($_GET['offset'] ?? 0);

// Validate sort order
if (!in_array($sort_order, ['ASC', 'DESC'])) {
    $sort_order = 'DESC';
}

// Validate sort column
$allowed_sort = ['id', 'name', 'email', 'role', 'created_at', 'is_active'];
if (!in_array($sort_by, $allowed_sort)) {
    $sort_by = 'created_at';
}

// Build WHERE clause
$where = [];
$params = [];

if ($role && in_array($role, ['student', 'ta', 'professor', 'admin'])) {
    $where[] = 'role = ?';
    $params[] = $role;
}

if ($is_active !== null) {
    $where[] = 'is_active = ?';
    $params[] = $is_active;
}

if ($search) {
    $where[] = '(name LIKE ? OR email LIKE ? OR preferred_name LIKE ?)';
    $search_term = '%' . $search . '%';
    $params[] = $search_term;
    $params[] = $search_term;
    $params[] = $search_term;
}

$where_sql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

// Get total count
$count_stmt = $pdo->prepare("SELECT COUNT(*) as total FROM users $where_sql");
$count_stmt->execute($params);
$total = (int)$count_stmt->fetch(PDO::FETCH_ASSOC)['total'];

// Get users
$stmt = $pdo->prepare("
    SELECT
        id,
        name,
        preferred_name,
        email,
        role,
        pronouns,
        academic_year,
        major,
        title,
        is_active,
        created_at,
        deactivated_at
    FROM users
    $where_sql
    ORDER BY $sort_by $sort_order
    LIMIT $limit OFFSET $offset
");

$stmt->execute($params);
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Get enrollment counts for each user
$user_ids = array_column($users, 'id');
if ($user_ids) {
    $placeholders = implode(',', array_fill(0, count($user_ids), '?'));
    $enrollment_stmt = $pdo->prepare("
        SELECT user_id, COUNT(*) as course_count
        FROM enrollments
        WHERE user_id IN ($placeholders)
        GROUP BY user_id
    ");
    $enrollment_stmt->execute($user_ids);
    $enrollments = $enrollment_stmt->fetchAll(PDO::FETCH_ASSOC);

    $enrollment_map = [];
    foreach ($enrollments as $e) {
        $enrollment_map[$e['user_id']] = (int)$e['course_count'];
    }

    // Add course count to each user
    foreach ($users as &$user) {
        $user['course_count'] = $enrollment_map[$user['id']] ?? 0;
    }
}

echo json_encode([
    'users' => $users,
    'pagination' => [
        'total' => $total,
        'limit' => $limit,
        'offset' => $offset,
        'has_more' => ($offset + $limit) < $total
    ]
]);
