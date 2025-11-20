<?php
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/_shared.php';

use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

$pdo = pdo_or_die();

// Replace with your VAPID keys
$auth = [
  'VAPID' => [
    'subject' => 'mailto:your-email@buffalo.edu',
    'publicKey' => 'BM_yjEGkCi6pekb9dN6xvoa61DMYAVJkmlNRX0FKHN_GhE1UY8RcTzckxTXTvObCsqvYoGHUiSPLwr6nHH3TaHM',
    'privateKey' => 'l4JbT-IU7Ea7wFjFjq89s08XCPBPmLEpuZ1cZwFigs8',
  ],
];

$stmt = $pdo->query("SELECT push_sub FROM users WHERE push_sub IS NOT NULL LIMIT 1");
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$row) {
  die("No subscriptions found");
}

$sub = json_decode($row['push_sub'], true);
$subscription = Subscription::create($sub);

$webPush = new WebPush($auth);
$result = $webPush->sendOneNotification(
  $subscription,
  json_encode(['title' => 'Office Hours Reminder', 'body' => 'Your office hours start in 10 minutes!'])
);

foreach ($webPush->flush() as $report) {
  if ($report->isSuccess()) {
    echo "✅ Notification sent successfully!";
  } else {
    echo "❌ Failed: " . $report->getReason();
  }
}