<?php
// Resolves numeric course id from a mixed input.
// Accepts: numeric id (int/string) OR course code like "CSE116".
function resolve_course_id(PDO $pdo, $input) : int {
  if (is_numeric($input)) {
    return (int)$input;
  }
  $code = is_string($input) ? trim($input) : '';
  if ($code === '') return 0;

  $q = $pdo->prepare('SELECT id FROM courses WHERE code = ? LIMIT 1');
  $q->execute([$code]);
  $r = $q->fetch(PDO::FETCH_ASSOC);
  return $r ? (int)$r['id'] : 0;
}
