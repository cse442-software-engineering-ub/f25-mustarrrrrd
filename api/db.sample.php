<?php
// local db config; use this as template for a seperate file: db.php
// never commit secrets here
$DB_HOST = '127.0.0.1';
$DB_NAME = 'cse442_2025_fall_team_ai_db';
$DB_USER = 'root';
$DB_PASS = '';

function pdo() {
  static $pdo = null;
  if ($pdo === null) {
    $dsn = "mysql:host={$GLOBALS['DB_HOST']};dbname={$GLOBALS['DB_NAME']};charset=utf8mb4";
    $pdo = new PDO($dsn, $GLOBALS['DB_USER'], $GLOBALS['DB_PASS'], [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
  }
  return $pdo;
}

const MAX_LEN = 191;
function clamp191($s) {
  if (!is_string($s)) return '';
  $s = trim($s);
  return mb_substr($s, 0, MAX_LEN, 'UTF-8');
}

function read_json() {
  $raw = file_get_contents('php://input');
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

/**
 * Set CORS headers with origin whitelist validation
 * Call this early in your API endpoints
 */
function set_cors_headers() {
  // Whitelist of allowed origins
  $allowed_origins = [
    // LOCAL
    'http://localhost',

    // XAMPP LOCAL environment
    'http://localhost/f25-mustarrrrrd',

    // DEV SERVER + PROD SERVER
    'https://aptitude.cse.buffalo.edu',
    'https://cattle.cse.buffalo.edu',
  ];

  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

  // Only set CORS headers if origin is in whitelist
  if (in_array($origin, $allowed_origins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
  }
}