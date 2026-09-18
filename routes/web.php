<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\TeacherController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\StudentSubjectController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\MaintenanceController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

Route::get('/', fn() => redirect('/login/admin'))->name('landing');

// Auth
Route::get('/login/admin', [AuthController::class, 'showAdminLogin'])->name('login.admin');
Route::get('/login/teacher', [AuthController::class, 'showTeacherLogin'])->name('login.teacher');
Route::get('/login/student', [StudentController::class, 'showLogin'])->name('login.student');

// Staff & Admin Routes
$adminRoutes = function () {
    Route::get('/dashboard',        [AdminController::class, 'dashboard'])->name('dashboard');
    Route::get('/add-students',     [AdminController::class, 'addStudents'])->name('add-students');
    Route::get('/records',          [AdminController::class, 'records'])->name('records');
    Route::get('/manage-teachers',  [AdminController::class, 'manageTeachers'])->name('manage-teachers');
    Route::get('/assign-section',   [AdminController::class, 'assignSection'])->name('assign-section');
    Route::get('/activity-logs',    [AdminController::class, 'activityLogs'])->name('activity-logs');
    Route::get('/subjects',         [AdminController::class, 'settings'])->name('subjects'); // Currently maps to settings/placeholder or could just return dashboard if view is SPA
    Route::get('/analytics',        [AdminController::class, 'analytics'])->name('analytics');
    Route::get('/settings',         [AdminController::class, 'settings'])->name('settings');
};

Route::group(['prefix' => 'admin', 'as' => 'admin.'], $adminRoutes);
Route::group(['prefix' => 'principal', 'as' => 'principal.'], $adminRoutes);
Route::group(['prefix' => 'curriculum_coordinator', 'as' => 'curriculum_coordinator.'], $adminRoutes);

// Teacher Routes
Route::group(['prefix' => 'teacher', 'as' => 'teacher.'], function () {
    Route::get('/dashboard',    [TeacherController::class, 'dashboard'])->name('dashboard');
    Route::get('/add-students', [TeacherController::class, 'addStudents'])->name('add-students');
    Route::get('/records',      [TeacherController::class, 'records'])->name('records');
    Route::get('/activity-logs', [TeacherController::class, 'activityLogs'])->name('activity-logs');
    Route::get('/settings',     [TeacherController::class, 'settings'])->name('settings');

});

// Student Routes
Route::group(['prefix' => 'student', 'as' => 'student.'], function () {
    Route::get('/dashboard',    [StudentController::class, 'dashboard'])->name('dashboard');
});

// ─── JSON API (CSRF-exempt for SPA fetch calls) ──────────────────────────────
$nocsrf = [\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class];

// Students API
Route::post('/api/chat',             [ChatController::class, 'chat'])->withoutMiddleware($nocsrf);
Route::get('/api/students/statistics', [StudentController::class, 'statistics'])->withoutMiddleware($nocsrf);
Route::get('/api/students',          [StudentController::class, 'index'])->withoutMiddleware($nocsrf);
Route::post('/api/students',         [StudentController::class, 'store'])->withoutMiddleware($nocsrf);
Route::put('/api/students/{id}',     [StudentController::class, 'update'])->withoutMiddleware($nocsrf);
Route::delete('/api/students/{id}',    [StudentController::class, 'destroy'])->withoutMiddleware($nocsrf);
Route::post('/api/students/bulk-delete', [StudentController::class, 'bulkDelete'])->withoutMiddleware($nocsrf);
Route::post('/api/students/login',   [StudentController::class, 'login'])->withoutMiddleware($nocsrf);
Route::post('/api/students/login-by-lrn', [StudentController::class, 'loginByLrn'])->withoutMiddleware($nocsrf);
Route::post('/api/students/set-password', [StudentController::class, 'setPassword'])->withoutMiddleware($nocsrf);
Route::post('/api/students/update-password', [StudentController::class, 'updatePassword'])->withoutMiddleware($nocsrf);
Route::post('/api/students/verify-qr-pin', [StudentController::class, 'verifyQrPin'])->withoutMiddleware($nocsrf);
Route::post('/api/students/setup-qr-pin', [StudentController::class, 'setupQrPin'])->withoutMiddleware($nocsrf);
Route::post('/api/students/upload-profile', [StudentController::class, 'uploadProfilePicture'])->withoutMiddleware($nocsrf);

// Teachers API
Route::get('/api/teachers',          [TeacherController::class, 'index'])->withoutMiddleware($nocsrf);
Route::get('/api/teachers/submitted-grades', [TeacherController::class, 'submittedGrades'])->withoutMiddleware($nocsrf);
Route::post('/api/teachers',         [TeacherController::class, 'store'])->withoutMiddleware($nocsrf);
Route::put('/api/teachers/{id}',     [TeacherController::class, 'update'])->withoutMiddleware($nocsrf);
Route::delete('/api/teachers/{id}',  [TeacherController::class, 'destroy'])->withoutMiddleware($nocsrf);
Route::post('/api/teachers/login',   [TeacherController::class, 'login'])->withoutMiddleware($nocsrf);
Route::post('/api/teachers/login-by-id', [TeacherController::class, 'loginById'])->withoutMiddleware($nocsrf);
Route::post('/api/teachers/change-password', [TeacherController::class, 'changePassword'])->withoutMiddleware($nocsrf);
Route::post('/api/teachers/upload-profile',   [TeacherController::class, 'uploadProfilePicture'])->withoutMiddleware($nocsrf);
Route::post('/api/teachers/verify-qr-pin',   [TeacherController::class, 'verifyQrPin'])->withoutMiddleware($nocsrf);
Route::post('/api/teachers/setup-qr-pin',   [TeacherController::class, 'setupQrPin'])->withoutMiddleware($nocsrf);

// Grades / E-Class Record API
Route::get('/api/grades/all-subjects',       [StudentSubjectController::class, 'allSubjects'])->withoutMiddleware($nocsrf);
Route::get('/api/students/{lrn}/subjects',   [StudentSubjectController::class, 'index'])->withoutMiddleware($nocsrf);
Route::post('/api/grades/save',              [StudentSubjectController::class, 'save'])->withoutMiddleware($nocsrf);
Route::post('/api/grades/save-bulk',         [StudentSubjectController::class, 'saveBulk'])->withoutMiddleware($nocsrf);
Route::post('/api/grades/clear-section',   [StudentSubjectController::class, 'clearSection'])->withoutMiddleware($nocsrf);

use App\Http\Controllers\ActivityLogController;

// Attendance API
Route::get('/api/attendance/{lrn}',          [AttendanceController::class, 'index'])->withoutMiddleware($nocsrf);
Route::get('/api/attendance/section/{section}', [AttendanceController::class, 'getSectionAttendance'])->withoutMiddleware($nocsrf);
Route::post('/api/attendance/save-bulk',      [AttendanceController::class, 'saveBulk'])->withoutMiddleware($nocsrf);
Route::post('/api/attendance/save-section-bulk', [AttendanceController::class, 'saveSectionBulk'])->withoutMiddleware($nocsrf);

// Activity Logs API
Route::get('/api/activity-logs', [ActivityLogController::class, 'index'])->withoutMiddleware($nocsrf);
Route::post('/api/activity-logs', [ActivityLogController::class, 'store'])->withoutMiddleware($nocsrf);

// Maintenance API
Route::get('/api/maintenance/settings', [MaintenanceController::class, 'getSettings'])->withoutMiddleware($nocsrf);
Route::post('/api/maintenance/settings', [MaintenanceController::class, 'saveSettings'])->withoutMiddleware($nocsrf);
Route::post('/api/maintenance/upload-logo', [MaintenanceController::class, 'uploadLogo'])->withoutMiddleware($nocsrf);
Route::post('/api/maintenance/upload-login-background', [MaintenanceController::class, 'uploadLoginBackground'])->withoutMiddleware($nocsrf);
Route::post('/api/maintenance/restore-default-background', [MaintenanceController::class, 'restoreDefaultBackground'])->withoutMiddleware($nocsrf);
