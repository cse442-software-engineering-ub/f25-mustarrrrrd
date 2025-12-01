<?php
declare(strict_types=1);

require_once __DIR__ . '/_shared.php';

json_headers();

try {
    // Start session normally
    sess_start();

    // Check if user is logged in via session
    if (!empty($_SESSION['user_id'])) {
        out(200, [
            'loggedIn' => true,
            'user_id'  => (int)$_SESSION['user_id'],
            'email'    => $_SESSION['email'] ?? '',
            'name'     => $_SESSION['name'] ?? '',
            'role'     => $_SESSION['role'] ?? '',
        ]);
    }

    // Try remember_token if no session
    $token = $_COOKIE['remember_token'] ?? null;

    if ($token && is_string($token) && strlen($token) > 20) {
        $pdo = pdo_or_die();
        $hash = hash('sha256', $token);
        $stmt = $pdo->prepare(
            'SELECT id, email, name, role FROM users WHERE session_token = ? LIMIT 1'
        );
        $stmt->execute([$hash]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            // Restore session from token
            $_SESSION['user_id'] = (int)$row['id'];
            $_SESSION['email']   = $row['email'];
            $_SESSION['name']    = $row['name'];
            $_SESSION['role']    = $row['role'];

            out(200, [
                'loggedIn' => true,
                'user_id'  => (int)$row['id'],
                'email'    => $row['email'],
                'name'     => $row['name'],
                'role'     => $row['role'],
            ]);
        }
    }

    // Not logged in
    out(200, ['loggedIn' => false]);
} catch (Throwable $e) {
    error_log('check_session error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    out(200, ['loggedIn' => false, 'error' => 'Session check failed']);
}
