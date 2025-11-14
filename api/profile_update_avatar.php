<?php
require __DIR__ . '/db.php';

header("Content-Type: application/json");

session_start();

try {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'not logged in']);
        exit;
    }

    $user_id = (int)$_SESSION['user_id'];
    $avatar_seed = bin2hex(random_bytes(8));

    // Update avatar_seed using PDO
    $stmt = pdo()->prepare("UPDATE users SET avatar_seed = ? WHERE id = ?");
    $stmt->execute([$avatar_seed, $user_id]);

    echo json_encode([
        'ok' => true,
        'avatar_seed' => $avatar_seed
    ]);

} catch (PDOException $e) {

    http_response_code(500);
    echo json_encode([
        'error' => 'server error',
        'details' => $e->getMessage()
    ]);
}
