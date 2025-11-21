<?php
declare(strict_types=1);
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

error_log("check_session.php started", 0);

require_once __DIR__ . '/db.php';

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

error_log("THE PATCHED VERSION IS LOADED", 0);

// ----------------------------------------------------------
// 0. Helper: unified reply()
// ----------------------------------------------------------
function reply($ok, $extra = []) {
    echo json_encode(array_merge(['ok' => $ok], $extra));
    exit;
}

// ----------------------------------------------------------
// 1. Read session WITHOUT USING session_start()  (NO LOCKS)
// ----------------------------------------------------------
$sessionId = $_COOKIE[session_name()] ?? '';
$existingSession = [];

if ($sessionId !== '') {
    $sessionFile = session_save_path() . "/sess_" . $sessionId;

    if (is_file($sessionFile)) {
        $raw = file_get_contents($sessionFile);
        if ($raw !== false) {
            $un = @unserialize($raw);
            if (is_array($un)) {
                $existingSession = $un;
            }
        }
    }
}

// ----------------------------------------------------------
// 1A. If user in session, return immediately
// ----------------------------------------------------------
if (!empty($existingSession['user_id'])) {
    reply(true, [
        'loggedIn' => true,
        'user_id'  => $existingSession['user_id'],
        'email'    => $existingSession['email'] ?? '',
        'name'     => $existingSession['name'] ?? '',
        'role'     => $existingSession['role'] ?? '',
    ]);
}

// ----------------------------------------------------------
// 2. No session → Try remember_token
// ----------------------------------------------------------
error_log("check_session.php reached token check", 0);

$token = $_COOKIE['remember_token'] ?? null;

if ($token && is_string($token) && strlen($token) > 20) {
    try {
        $pdo = pdo();
        error_log("pdo happened", 0);

        $hash = hash('sha256', $token);
        $stmt = $pdo->prepare(
            'SELECT id, email, name, role FROM users WHERE session_token = ? LIMIT 1'
        );
        $stmt->execute([$hash]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            // ----------------------------------------------------------
            // Only NOW do we open a real session (write mode)
            // ----------------------------------------------------------
            session_start(); 
            $_SESSION['user_id'] = (int)$row['id'];
            $_SESSION['email']   = $row['email'];
            $_SESSION['name']    = $row['name'];
            $_SESSION['role']    = $row['role'];
            session_write_close();

            reply(true, [
                'loggedIn' => true,
                'user_id'  => (int)$row['id'],
                'email'    => $row['email'],
                'name'     => $row['name'],
                'role'     => $row['role'],
            ]);
        }
    } catch (Throwable $e) {
        error_log('Check session error: ' . $e->getMessage());
        reply(false, [
            'loggedIn' => false,
            'error'    => 'Server error during token rebuild'
        ]);
    }
}

// ----------------------------------------------------------
// 3. Not logged in
// ----------------------------------------------------------
reply(true, ['loggedIn' => false]);
