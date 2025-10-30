<?php
require_once __DIR__ . '/vendor/autoload.php';
use Minishlink\WebPush\VAPID;

$keys = VAPID::createVapidKeys();
echo "Public Key:\n" . $keys['publicKey'] . "\n\n";
echo "Private Key:\n" . $keys['privateKey'] . "\n";
