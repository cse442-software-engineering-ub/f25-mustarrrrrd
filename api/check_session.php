<?php
session_start();

header('Content-Type: application/json');

// CORS
if (isset($_SERVER['HTTP_ORIGIN'])) {
  header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
  header('Access-Control-Allow-Credentials: true');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  header('Access-Control-Allow-Methods: GET, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  exit;
}

// Check if user is logged in
if (isset($_SESSION['user_id']) && isset($_SESSION['email'])) {
  echo json_encode([
    'loggedIn' => true,
    'user' => [
      'id' => $_SESSION['user_id'],
      'email' => $_SESSION['email'],
      'name' => $_SESSION['name'] ?? ''
    ]
  ]);
} else {
  echo json_encode(['loggedIn' => false]);
}
