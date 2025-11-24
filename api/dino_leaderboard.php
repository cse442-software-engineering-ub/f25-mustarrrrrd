<?php
declare(strict_types=1);

require_once __DIR__ . '/_shared.php';

json_headers();

try {
  $pdo = pdo_or_die();
  ensure_leaderboard_table($pdo);

  $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
  if ($method === 'POST') {
    // POST requires session
    sess_start();
    handle_leaderboard_submit($pdo);
  } else {
    // GET doesn't require session, but will use it if available
    try {
      sess_start();
    } catch (Throwable $e) {
      // Session not available, continue without it
    }
    $limit = isset($_GET['limit']) ? max(1, min(50, (int)$_GET['limit'])) : 10;
    $payload = build_leaderboard_payload($pdo, $limit);
    out(200, $payload);
  }
} catch (Throwable $e) {
  error_log('dino_leaderboard error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
  out(500, ['ok' => false, 'error' => 'Server error']);
}

function ensure_leaderboard_table(PDO $pdo): void {
  try {
    $sql = "
      CREATE TABLE IF NOT EXISTS dino_leaderboard (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        user_email VARCHAR(191) DEFAULT NULL,
        display_name VARCHAR(191) DEFAULT NULL,
        score INT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_user (user_id),
        KEY idx_score (score),
        KEY idx_updated (updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ";
    $pdo->exec($sql);
  } catch (Throwable $e) {
    // Table might already exist or there's a permission issue
    // Check if table exists before throwing
    try {
      $check = $pdo->query("SELECT 1 FROM dino_leaderboard LIMIT 1");
      // Table exists, continue
    } catch (Throwable $e2) {
      error_log('Failed to create/access dino_leaderboard table: ' . $e->getMessage());
      throw $e;
    }
  }
}

function handle_leaderboard_submit(PDO $pdo): void {
  if (!isset($_SESSION['user_id'])) {
    out(401, ['ok' => false, 'error' => 'Login required']);
  }

  $body = file_get_contents('php://input');
  $json = is_string($body) ? json_decode($body, true) : null;
  if (!is_array($json)) {
    out(400, ['ok' => false, 'error' => 'Invalid payload']);
  }

  $score = isset($json['score']) ? (int)$json['score'] : 0;
  if ($score <= 0) {
    out(400, ['ok' => false, 'error' => 'Score must be greater than zero']);
  }
  $score = min($score, 1000000); // keep numbers reasonable

  $userId = (int)$_SESSION['user_id'];
  $displayName = leaderboard_display_name($pdo, $userId);
  $email = $_SESSION['email'] ?? null;

  $stmt = $pdo->prepare('SELECT score FROM dino_leaderboard WHERE user_id = ? LIMIT 1');
  $stmt->execute([$userId]);
  $currentBest = $stmt->fetchColumn();

  if ($currentBest !== false && (int)$currentBest >= $score) {
    // No improvement; still return the latest board
    $payload = build_leaderboard_payload($pdo, 10, $userId);
    $payload['message'] = 'Score not higher than best';
    out(200, $payload);
  }

  $upsert = $pdo->prepare('
    INSERT INTO dino_leaderboard (user_id, user_email, display_name, score)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      user_email = VALUES(user_email),
      display_name = VALUES(display_name),
      score = GREATEST(score, VALUES(score)),
      updated_at = CURRENT_TIMESTAMP
  ');
  $upsert->execute([$userId, $email, $displayName, $score]);

  $payload = build_leaderboard_payload($pdo, 10, $userId);
  out(200, $payload);
}

function build_leaderboard_payload(PDO $pdo, int $limit, ?int $userId = null): array {
  $limit = max(1, min(50, (int)$limit));
  $rows = [];
  
  try {
    // Validate and sanitize limit (safe to use in query since it's validated to be 1-50)
    $safeLimit = max(1, min(50, (int)$limit));
    $sql = "
      SELECT user_id, display_name, user_email, score, updated_at
      FROM dino_leaderboard
      ORDER BY score DESC, updated_at ASC
      LIMIT " . (int)$safeLimit;
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    error_log("Leaderboard query returned " . count($rows) . " rows");
  } catch (Throwable $e) {
    error_log('Leaderboard query error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    $rows = [];
  }

  $leaderboard = [];
  foreach ($rows as $idx => $row) {
    $leaderboard[] = [
      'rank' => $idx + 1,
      'name' => $row['display_name'] ?: ($row['user_email'] ? explode('@', $row['user_email'])[0] : 'Player'),
      'score' => (int)$row['score'],
      'updated_at' => $row['updated_at'],
    ];
  }

  $yourBest = null;
  $yourRank = null;
  if ($userId !== null) {
    [$yourBest, $yourRank] = leaderboard_user_stats($pdo, $userId);
  } elseif (isset($_SESSION['user_id'])) {
    try {
      $uid = (int)$_SESSION['user_id'];
      [$yourBest, $yourRank] = leaderboard_user_stats($pdo, $uid);
    } catch (Throwable $e) {
      // Ignore errors getting user stats
    }
  }

  $result = [
    'ok' => true,
    'leaderboard' => $leaderboard,
    'yourBest' => $yourBest,
    'yourRank' => $yourRank,
  ];
  
  error_log('Leaderboard payload: ' . count($leaderboard) . ' entries, yourBest=' . ($yourBest ?? 'null') . ', yourRank=' . ($yourRank ?? 'null'));
  return $result;
}

function leaderboard_user_stats(PDO $pdo, int $userId): array {
  $stmt = $pdo->prepare('SELECT score FROM dino_leaderboard WHERE user_id = ? LIMIT 1');
  $stmt->execute([$userId]);
  $best = $stmt->fetchColumn();
  if ($best === false) {
    return [null, null];
  }

  $bestScore = (int)$best;
  $rankStmt = $pdo->prepare('SELECT COUNT(*) + 1 FROM dino_leaderboard WHERE score > ?');
  $rankStmt->execute([$bestScore]);
  $rank = (int)$rankStmt->fetchColumn();

  return [$bestScore, $rank];
}

function leaderboard_display_name(PDO $pdo, int $userId): string {
  $name = trim((string)($_SESSION['name'] ?? ''));
  if ($name === '') {
    $query = $pdo->prepare('SELECT name FROM users WHERE id = ? LIMIT 1');
    $query->execute([$userId]);
    $dbName = $query->fetchColumn();
    if ($dbName) {
      $name = trim((string)$dbName);
    }
  }

  if ($name === '') {
    $email = $_SESSION['email'] ?? '';
    if ($email && strpos($email, '@') !== false) {
      $name = strstr($email, '@', true);
    }
  }

  if ($name === '') {
    $name = 'Player';
  }

  $name = preg_replace('/\s+/', ' ', $name);
  if (function_exists('mb_substr')) {
    return mb_substr($name, 0, 160);
  }
  return substr($name, 0, 160);
}

