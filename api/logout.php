<?php
session_start();

// Clear session variables
$_SESSION = [];

// Destroy the session
session_destroy();

// Remove session cookie if set
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

header('Content-Type: application/json');
echo json_encode(["success" => true, "message" => "Logged out"]);
exit;
?>