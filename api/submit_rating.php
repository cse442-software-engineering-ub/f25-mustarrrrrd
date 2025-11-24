<?php
declare(strict_types=1);
require_once(__DIR__ . "/_shared.php");
json_headers();
sess_start();
$pdo = pdo_or_die();

try {
  // Parse input
  $input = json_decode(file_get_contents('php://input'), true) ?? [];
  $session_id = trim($input['session_id'] ?? '');
  $rating = isset($input['rating']) ? (int)$input['rating'] : 0;

  // Validate session_id
  if ($session_id === '') {
    out(400, ['ok' => false, 'error' => 'Session ID is required']);
  }

  // Validate rating (must be between 1 and 5)
  if ($rating < 1 || $rating > 5) {
    out(400, ['ok' => false, 'error' => 'Rating must be between 1 and 5']);
  }

  // Get current user's email from session
  $user_email = $_SESSION['email'] ?? null;
  if (!$user_email) {
    out(401, ['ok' => false, 'error' => 'User not logged in']);
  }

  // Check if the session exists
  $stmt = $pdo->prepare('SELECT id FROM office_hours_sessions WHERE id = ? LIMIT 1');
  $stmt->execute([$session_id]);
  $session = $stmt->fetch(PDO::FETCH_ASSOC);
  
  if (!$session) {
    out(404, ['ok' => false, 'error' => 'Session not found']);
  }

  // Begin transaction
  $pdo->beginTransaction();

  try {
    // Check if a rating already exists for this user and session
    $stmt = $pdo->prepare('
      SELECT id FROM session_ratings 
      WHERE session_id = ? AND user_email = ? 
      LIMIT 1
    ');
    $stmt->execute([$session_id, $user_email]);
    $existingRating = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existingRating) {
      // Update existing rating
      $stmt = $pdo->prepare('
        UPDATE session_ratings 
        SET rating = ?, rated_at = NOW() 
        WHERE session_id = ? AND user_email = ?
      ');
      $stmt->execute([$rating, $session_id, $user_email]);
    } else {
      // Insert new rating
      $stmt = $pdo->prepare('
        INSERT INTO session_ratings (session_id, user_email, rating, rated_at) 
        VALUES (?, ?, ?, NOW())
      ');
      $stmt->execute([$session_id, $user_email, $rating]);
    }

    // Commit transaction
    $pdo->commit();

    out(200, [
      'ok' => true,
      'message' => 'Rating submitted successfully',
      'rating' => $rating
    ]);
  } catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
  }
} catch (Throwable $e) {
  out(500, ['ok' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}