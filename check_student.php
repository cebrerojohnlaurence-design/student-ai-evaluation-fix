<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$student = DB::table('students')->where('lrn', '12316546')->first();
echo json_encode($student, JSON_PRETTY_PRINT);
