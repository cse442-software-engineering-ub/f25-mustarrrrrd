<?php
session_start();
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

$user_id = $_SESSION['user_id'];

try {
    $pdo = pdo();

    // Get all courses the user is enrolled in along with favorite status
    // Also include active session information if there's one happening now
    $stmt = $pdo->prepare("
        SELECT
            c.id,
            c.code,
            c.title,
            c.lecture_times,
            c.room,
            e.role_in_course,
            CASE WHEN f.course_id IS NOT NULL THEN 1 ELSE 0 END as is_favorited,
            ohs.id as active_session_id,
            DATE_FORMAT(ohs.start_time, '%h:%i %p') as active_session_start,
            DATE_FORMAT(ohs.end_time, '%h:%i %p') as active_session_end,
            ohs.location as active_session_location,
            u.name as active_session_host
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN favorites f ON f.course_id = c.id AND f.user_id = ?
        LEFT JOIN office_hours_sessions ohs ON ohs.course_id = c.id
            AND ohs.day_of_week = DAYNAME(NOW())
            AND CURTIME() BETWEEN ohs.start_time AND ohs.end_time
        LEFT JOIN users u ON ohs.instructor_id = u.id
        WHERE e.user_id = ?
    ");
    $stmt->execute([$user_id, $user_id]);
    $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Transform the data to include activeSession object when applicable
    $coursesWithActiveSessions = array_map(function($course) {
        $result = [
            'id' => $course['id'],
            'code' => $course['code'],
            'title' => $course['title'],
            'lecture_times' => $course['lecture_times'],
            'room' => $course['room'],
            'role_in_course' => $course['role_in_course'],
            'is_favorited' => (bool)$course['is_favorited']
        ];

        // Add activeSession if there's one happening now
        if ($course['active_session_id']) {
            $result['activeSession'] = [
                'id' => $course['active_session_id'],
                'startTime' => $course['active_session_start'],
                'endTime' => $course['active_session_end'],
                'location' => $course['active_session_location'],
                'host' => $course['active_session_host']
            ];
        }

        return $result;
    }, $courses);

    echo json_encode(['courses' => $coursesWithActiveSessions]);

} catch (PDOException $e) {
    error_log('My courses error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}
