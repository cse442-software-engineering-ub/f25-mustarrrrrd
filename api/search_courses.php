<?php
require __DIR__ . '/db.php';

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Read JSON input
$input = read_json();

if (!isset($input["query"]) || empty(trim($input["query"]))) {
    echo json_encode(["courses" => []]);
    exit;
}

$searchTerm = clamp191($input["query"]);

try {
    $pdo = pdo();

    // Search only by code or title, matching from the beginning (order-sensitive)
    $sql = "
        SELECT id, code, title, lecture_times, room
        FROM courses
        WHERE code LIKE :search
           OR title LIKE :search
        ORDER BY title ASC
    ";

    // Match terms starting with the searchTerm (e.g., 'CSE' matches CSE220, but not E220)
    $stmt = $pdo->prepare($sql);
    $stmt->execute(["search" => "{$searchTerm}%"]);

    $courses = $stmt->fetchAll();

    echo json_encode(["courses" => $courses], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "error" => true,
        "message" => $e->getMessage()
    ]);
}
?>
