<?php
require __DIR__ . '/db.php';

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Read JSON input safely
$input = read_json();

if (!isset($input["query"]) || empty(trim($input["query"]))) {
    echo json_encode(["tas" => []]);
    exit;
}

if (!isset($input["course_id"]) || empty(trim($input["course_id"]))) {
    echo json_encode(["tas" => []]);
    exit;
}

$searchTerm = clamp191($input["query"]);
$courseId = $input["course_id"];

try {
    $pdo = pdo();

    // Prepare search patterns for flexible matching
    $searchPattern = "%{$searchTerm}%"; // Match anywhere in string
    $searchNoSpace = "%" . str_replace(' ', '', $searchTerm) . "%"; // Match without spaces

    // Search for TAs enrolled in the specified course
    // Search across name and email fields
    $sql = "
        SELECT u.name, u.email
        FROM users u
        INNER JOIN enrollments e ON u.id = e.user_id
        INNER JOIN courses c ON e.course_id = c.id
        WHERE c.code = :course_id
          AND e.role_in_course = 'ta'
          AND (
              u.name LIKE :search
              OR REPLACE(u.name, ' ', '') LIKE :search_nospace
              OR u.email LIKE :search
          )
        ORDER BY
            CASE
                WHEN u.name LIKE :search_prefix THEN 1
                WHEN u.email LIKE :search_prefix THEN 2
                WHEN u.name LIKE :search THEN 3
                ELSE 4
            END,
            u.name ASC
    ";

    $stmt = $pdo->prepare($sql);
    $params = [
        "course_id" => $courseId,
        "search" => $searchPattern,
        "search_nospace" => $searchNoSpace,
        "search_prefix" => "{$searchTerm}%"
    ];
    $stmt->execute($params);

    $tas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["tas" => $tas], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "error" => true,
        "message" => $e->getMessage()
    ]);
}
?>