<?php
// debug_session_check.php — disabled
// This file was a temporary debugging endpoint. It has been disabled to avoid
// accidental usage in production. If you need to re-enable debugging, restore
// the original version from VCS or contact the developers.

header('Content-Type: application/json');
http_response_code(410);
echo json_encode(['ok'=>false,'error'=>'debug_endpoint_disabled']);

