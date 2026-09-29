<?php
$pdo = new PDO('sqlite:database/database.sqlite');
$stmt = $pdo->query('SELECT count(*), section FROM students GROUP BY section');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
