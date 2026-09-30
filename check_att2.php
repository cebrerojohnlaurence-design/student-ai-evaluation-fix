<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$student = DB::table('students')->where('lrn', '12316546')->first();
echo "Student ID: " . $student->id . "\n";
$atts = DB::table('student_attendances')->where('student_id', $student->id)->get();
echo "Attendances: " . count($atts) . "\n";
echo json_encode($atts, JSON_PRETTY_PRINT);
