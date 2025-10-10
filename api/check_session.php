<?php
// api/check_session.php
declare(strict_types=1);

// --- Never output anything before headers/session_start ---
header('Content-Type: application/json; charset=utf-8');

// CORS (reflect origin; allow credentials). Safe for local dev.
// If you run frontend on a different port/origin, this lets cookies through.
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header('Vary: Origin');
    header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
    header('Access-Control-Allow-Credentials: true');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

// Ensure session is started (in case auth.php didn't).
if (session_status() !== PHP_SESSION_ACTIVE) {
    // If you need cross-site cookies (different port/origin), you may need:
//    ini_set('session.cookie_samesite', 'None');
//    ini_set('session.cookie_secure', '1'); // requires https
    ini_set('session.cookie_httponly', '1');
    session_start();
}

// current_user() should return an associative array like:
// ['id' => 123, 'email' => 'x@y.com', 'role' => 'student'|'instructor', 'name' => '...']
// or null/false if not logged in.
$u = current_user();

if ($u) {
    $role = ($u['role'] ?? '') === 'instructor' ? 'professor' : ($u['role'] ?? 'student');

    $payload = [
        'loggedIn' => true,
        'role'     => $role,
        // top-level email so your React code that reads sdata.email works:
        'email'    => $u['email'] ?? '',
        // keep nested object too, for consistency elsewhere:
        'user'     => [
            'id'    => (int)($u['id'] ?? 0),
            'email' => $u['email'] ?? '',
            'name'  => $u['name'] ?? '',
        ],
    ];

    echo json_encode($payload);
    exit;
}

// Not logged in
echo json_encode(['loggedIn' => false]);
