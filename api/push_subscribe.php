<?php
declare(strict_types=1);
require_once __DIR__ . '/_shared.php';
require_once __DIR__ . '/auth.php';
json_headers();
sess_start();

$u = current_user();
if (!$u) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'not_logged_in']);
    exit;
}

try {
    $pdo = pdo_or_die();
    $body = json_decode(file_get_contents('php://input'), true);

    if (!$body) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'invalid_json']);
        exit;
    }

    // Store push subscription JSON in the user's record
    $stmt = $pdo->prepare('UPDATE users SET push_sub = ? WHERE id = ?');
    $stmt->execute([json_encode($body), $u['id']]);

    echo json_encode(['ok' => true]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
