<?php
// admin/courses_list.php — List all courses with analytics
require_once __DIR__ . '/../_shared.php';
require_once __DIR__ . '/../admin_auth.php';
set_cors_headers();
sess_start();


$admin = require_admin();
$pdo = pdo();

// Get query parameters
$search = $_GET['search'] ?? null;
$sort_by = $_GET['sort_by'] ?? 'created_at';
$sort_order = strtoupper($_GET['sort_order'] ?? 'DESC');
$limit = min((int)($_GET['limit'] ?? 50), 100);
$offset = (int)($_GET['offset'] ?? 0);

// Validate sort
if (!in_array($sort_order, ['ASC', 'DESC'])) {
    $sort_order = 'DESC';
}

$allowed_sort = ['id', 'code', 'title', 'student_count', 'ta_count', 'professor_count'];
if (!in_array($sort_by, $allowed_sort)) {
    $sort_by = 'id';
}

// Build WHERE clause
$where = [];
$params = [];

if ($search) {
    $where[] = '(c.code LIKE ? OR c.title LIKE ?)';
    $search_term = '%' . $search . '%';
    $params[] = $search_term;
    $params[] = $search_term;
}

$where_sql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

// Get courses with enrollment counts
$stmt = $pdo->prepare("
    SELECT
        c.id,
        c.code,
        c.title,
        c.lecture_times,
        c.room,
        COUNT(DISTINCT CASE WHEN e.role_in_course = 'student' THEN e.user_id END) as student_count,
        COUNT(DISTINCT CASE WHEN e.role_in_course = 'ta' THEN e.user_id END) as ta_count,
        COUNT(DISTINCT CASE WHEN e.role_in_course = 'professor' THEN e.user_id END) as professor_count,
        COUNT(DISTINCT ohs.id) as session_count
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id
    LEFT JOIN office_hours_sessions ohs ON c.id = ohs.course_id
    $where_sql
    GROUP BY c.id, c.code, c.title, c.lecture_times, c.room
    ORDER BY
        CASE WHEN ? = 'student_count' THEN COUNT(DISTINCT CASE WHEN e.role_in_course = 'student' THEN e.user_id END) END " . ($sort_by === 'student_count' ? $sort_order : '') . ",
        CASE WHEN ? = 'ta_count' THEN COUNT(DISTINCT CASE WHEN e.role_in_course = 'ta' THEN e.user_id END) END " . ($sort_by === 'ta_count' ? $sort_order : '') . ",
        CASE WHEN ? = 'professor_count' THEN COUNT(DISTINCT CASE WHEN e.role_in_course = 'professor' THEN e.user_id END) END " . ($sort_by === 'professor_count' ? $sort_order : '') . ",
        " . (in_array($sort_by, ['id', 'code', 'title']) ? "c.$sort_by $sort_order" : "c.id DESC") . "
    LIMIT $limit OFFSET $offset
");

$params[] = $sort_by;
$params[] = $sort_by;
$params[] = $sort_by;

$stmt->execute($params);
$courses = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Get total count
$count_params = array_slice($params, 0, count($where) * 2);
$count_stmt = $pdo->prepare("SELECT COUNT(DISTINCT c.id) as total FROM courses c $where_sql");
$count_stmt->execute($count_params);
$total = (int)$count_stmt->fetch(PDO::FETCH_ASSOC)['total'];

// Get queue activity for each course
$course_ids = array_column($courses, 'id');
if ($course_ids) {
    $placeholders = implode(',', array_fill(0, count($course_ids), '?'));
    $queue_stmt = $pdo->prepare("
        SELECT
            course_id,
            COUNT(*) as total_queue_entries,
            COUNT(CASE WHEN left_at IS NULL THEN 1 END) as active_queue_entries
        FROM queue_entries
        WHERE course_id IN ($placeholders)
        GROUP BY course_id
    ");
    $queue_stmt->execute($course_ids);
    $queue_data = $queue_stmt->fetchAll(PDO::FETCH_ASSOC);

    $queue_map = [];
    foreach ($queue_data as $q) {
        $queue_map[$q['course_id']] = [
            'total_queue_entries' => (int)$q['total_queue_entries'],
            'active_queue_entries' => (int)$q['active_queue_entries']
        ];
    }

    foreach ($courses as &$course) {
        $course['queue_stats'] = $queue_map[$course['id']] ?? [
            'total_queue_entries' => 0,
            'active_queue_entries' => 0
        ];
    }
}

echo json_encode([
    'courses' => $courses,
    'pagination' => [
        'total' => $total,
        'limit' => $limit,
        'offset' => $offset,
        'has_more' => ($offset + $limit) < $total
    ]
]);
