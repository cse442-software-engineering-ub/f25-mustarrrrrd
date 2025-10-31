<?php
declare(strict_types=1);
require_once(__DIR__ . "/_shared.php");
json_headers();
sess_start();
$pdo = pdo_or_die();

try {
  $email = $_SESSION['email'] ?? null;
  if (!$email) {
    out(401, ['ok' => false, 'error' => 'Not logged in']);
  }

  // Get user info
  $stmt = $pdo->prepare('SELECT id, name FROM users WHERE email = ? LIMIT 1');
  $stmt->execute([$email]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$user) {
    out(404, ['ok' => false, 'error' => 'User not found']);
  }

  $userId = (int)$user['id'];

  // Parse input
  $input = json_decode(file_get_contents('php://input'), true) ?? [];
  $code = trim($input['code'] ?? '');
  $title = trim($input['title'] ?? '');

  // Validate course code (max 6 characters, required)
  if ($code === '') {
    out(400, ['ok' => false, 'error' => 'Course code is required']);
  }
  if (strlen($code) > 6) {
    out(400, ['ok' => false, 'error' => 'Course code must be 6 characters or less']);
  }

  // Validate course title (required)
  if ($title === '') {
    out(400, ['ok' => false, 'error' => 'Course title is required']);
  }

  // Check if course code already exists
  $stmt = $pdo->prepare('SELECT id FROM courses WHERE code = ? LIMIT 1');
  $stmt->execute([$code]);
  if ($stmt->fetch()) {
    out(400, ['ok' => false, 'error' => 'Course code already exists']);
  }

  // Extract professor's last name for the professor field
  $fullName = trim($user['name'] ?? '');
  $nameParts = preg_split('/\s+/', $fullName);
  $lastName = end($nameParts);

  // Begin transaction
  $pdo->beginTransaction();

  try {
    // Create the course with default values for optional fields
    $stmt = $pdo->prepare('
      INSERT INTO courses (code, title, lecture_times, room)
      VALUES (?, ?, ?, ?)
    ');
    $stmt->execute([
      $code,
      $title,
      'TBD', // Default lecture times
      'TBD'  // Default room
    ]);

    $courseId = (int)$pdo->lastInsertId();

    // Enroll the professor in the course
    $stmt = $pdo->prepare('
      INSERT INTO enrollments (user_id, course_id, role_in_course)
      VALUES (?, ?, ?)
    ');
    $stmt->execute([$userId, $courseId, 'professor']);

    // Commit transaction
    $pdo->commit();

    out(200, [
      'ok' => true,
      'message' => 'Course created successfully',
      'course' => [
        'id' => $courseId,
        'code' => $code,
        'title' => $title,
        'lecture_times' => 'TBD',
        'room' => 'TBD',
        'professor' => $lastName
      ]
    ]);
  } catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
  }
} catch (Throwable $e) {
  out(500, ['ok' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}
