<?php
header('Content-Type: text/plain');

function tryConn($host) {
  try {
    $dsn = "mysql:host=$host;dbname=cse442_2025_fall_team_ai_db;charset=utf8mb4";
    $pdo = new PDO($dsn, "root", "", [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    echo "✅ Connected using host='$host'\n";
  } catch (Throwable $e) {
    echo "❌ Failed using host='$host' → " . $e->getMessage() . "\n";
  }
}

tryConn('localhost');
tryConn('127.0.0.1');
