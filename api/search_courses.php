<?php
require __DIR__ . '/db.php';

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Read JSON input safely
$input = read_json();

if (!isset($input["query"]) || empty(trim($input["query"]))) {
    echo json_encode(["courses" => []]);
    exit;
}

$searchTerm = clamp191($input["query"]);
$filter = isset($input["filter"]) ? strtolower(trim($input["filter"])) : "none";

try {
    $pdo = pdo();

    // Prepare search patterns for flexible matching
    $searchPattern = "%{$searchTerm}%"; // Match anywhere in string
    $searchNoSpace = "%" . str_replace(' ', '', $searchTerm) . "%"; // Match without spaces

    // Determine which column(s) to search with enhanced matching
    switch ($filter) {
        case "code":
            // For code, match with or without spaces (e.g., "442" matches "CSE 442" or "CSE442")
            $where = "code LIKE :search OR REPLACE(code, ' ', '') LIKE :search_nospace";
            break;
        case "name":
            $where = "title LIKE :search";
            break;
        case "none":
        default:
            // Search across all key fields with enhanced code matching
            $where = "code LIKE :search
                     OR REPLACE(code, ' ', '') LIKE :search_nospace
                     OR title LIKE :search";
            break;
    }

    $sql = "
        SELECT id, code, title, lecture_times, room
        FROM courses
        WHERE $where
        ORDER BY
            CASE
                WHEN code LIKE :search_prefix THEN 1
                WHEN code LIKE :search THEN 2
                WHEN title LIKE :search_prefix THEN 3
                ELSE 4
            END,
            code ASC
    ";

    $stmt = $pdo->prepare($sql);
    $params = [
        "search" => $searchPattern,
        "search_nospace" => $searchNoSpace,
        "search_prefix" => "{$searchTerm}%"
    ];
    $stmt->execute($params);

    $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["courses" => $courses], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "error" => true,
        "message" => $e->getMessage()
    ]);
}
?>
