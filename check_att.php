<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$count = DB::table('student_attendances')->count();
echo "Count: " . $count . "\n";
$first = DB::table('student_attendances')->first();
echo json_encode($first, JSON_PRETTY_PRINT);
