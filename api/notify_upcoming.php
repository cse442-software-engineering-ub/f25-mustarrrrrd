<?php
declare(strict_types=1);
require_once __DIR__ . '/_shared.php';
require_once __DIR__ . '/vendor/autoload.php';

use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

$pdo = pdo_or_die();

// Replace with your VAPID keys
$auth = [
  'VAPID' => [
    'subject' => 'mailto:admin@example.com',
    'publicKey' => '<YOUR_VAPID_PUBLIC_KEY>',
    'privateKey' => '<YOUR_VAPID_PRIVATE_KEY>',
  ],
];

$webPush = new WebPush($auth);

// Get all users with push subscriptions
$stmt = $pdo->query("SELECT email, push_sub FROM users WHERE push_sub IS NOT NULL");

while ($row = $stmt->fetch()) {
  $subData = json_decode($row['push_sub'], true);
  if (!$subData) continue;

  $sub = Subscription::create($subData);

  $payload = json_encode([
    'title' => 'Office Hour Reminder',
    'body' => 'Your office hour starts in 10 minutes!',
  ]);

  $webPush->queueNotification($sub, $payload);
}

$webPush->flush();
