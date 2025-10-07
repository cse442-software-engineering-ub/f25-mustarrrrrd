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

    // Determine which column(s) to search
    switch ($filter) {
        case "code":
            $where = "code LIKE :search";
            break;
        case "name":
            $where = "title LIKE :search";
            break;
        case "professor":
            $where = "professor LIKE :search";
            break;
        case "none":
        default:
            // Search across all key fields
            $where = "code LIKE :search OR title LIKE :search OR professor LIKE :search";
            break;
    }

    $sql = "
        SELECT code, title, lecture_times, room, professor
        FROM courses
        WHERE $where
        ORDER BY title ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(["search" => "{$searchTerm}%"]);

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
