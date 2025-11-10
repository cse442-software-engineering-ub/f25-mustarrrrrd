<?php
declare(strict_types=1);
require_once(__DIR__ . "/_shared.php");
json_headers();
sess_start();
$pdo = pdo_or_die();

try {
  // Parse input
  $input = json_decode(file_get_contents('php://input'), true) ?? [];
  $code = trim($input['code'] ?? '');
  $ta_email = trim($input['ta_email'] ?? '');

  // Validate course code (max 6 characters, required)
  if ($code === '') {
    out(400, ['ok' => false, 'error' => 'Course code is required']);
  }
  if (strlen($code) > 6) {
    out(400, ['ok' => false, 'error' => 'Course code must be 6 characters or less']);
  }

  // Validate course title (required)
  if ($ta_email === '') {
    out(400, ['ok' => false, 'error' => 'Course title is required']);
  }

  // Ensure the email is that of a user with the 'ta' role
  $stmt = $pdo->prepare('SELECT id, role FROM users WHERE email = ? LIMIT 1');
  $stmt->execute([$ta_email]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);
  $userRole = $user['role'];

  if ($userRole != 'ta') {
    out(400, ['ok' => false, 'error' => 'User must have the ta role']);
  }

  // Find unique course id in database
  $stmt = $pdo->prepare('SELECT id FROM courses WHERE code = ? LIMIT 1');
  $stmt->execute([$code]);
  $course = $stmt->fetch(PDO::FETCH_ASSOC);
  $courseId = (int)$course['id'];

  // Find user id of the TA in database
  $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
  $stmt->execute([$ta_email]);
  $ta = $stmt->fetch(PDO::FETCH_ASSOC);
  $taId = (int)$ta['id'];

  // Begin transaction
  $pdo->beginTransaction();

  try {
    // Enroll the ta in the course
    $stmt = $pdo->prepare('
      INSERT INTO enrollments (user_id, course_id, role_in_course)
      VALUES (?, ?, ?)
    ');
    $stmt->execute([$taId, $courseId, 'ta']);

    // Commit transaction
    $pdo->commit();

    out(200, [
      'ok' => true,
      'message' => 'TA added successfully',
      'enrollment' => [
        'user_id' => $taId,
        'course_id' => $courseId,
        'role_in_course' => 'ta',
      ]
    ]);
  } catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
  }
} catch (Throwable $e) {
  out(500, ['ok' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}
