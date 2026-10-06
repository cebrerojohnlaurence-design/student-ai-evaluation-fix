<?php
$ch = curl_init('http://localhost:8000/api/students?school_year=2025-2026');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
$data = json_decode($response, true);
$sam_students = array_filter($data, function($s) { return $s['section'] === 'Sam'; });
echo "Found " . count($sam_students) . " students in Sam:\n";
print_r(array_column($sam_students, 'name'));
