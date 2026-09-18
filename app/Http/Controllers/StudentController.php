<?php

namespace App\Http\Controllers;

use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class StudentController extends Controller
{
    /**
     * GET /login/student — Student login page.
     */
    public function showLogin()
    {
        return view('auth.student-login');
    }

    /**
     * GET /student/dashboard — Student dashboard page.
     */
    public function dashboard()
    {
        return view('student.dashboard');
    }

    /**
     * GET /api/students — Return all students as JSON.
     */
    public function index(Request $request)
    {
        $students = Student::orderBy('name')->get();

        $schoolYear = $request->query('school_year');
        if ($schoolYear) {
            $students->transform(function ($student) use ($schoolYear) {
                $historyRaw = $student->enrollment_history;
                $history = is_string($historyRaw) ? json_decode($historyRaw, true) : $historyRaw;
                if (is_array($history)) {
                    $found = collect($history)->firstWhere('school_year', $schoolYear);
                    if ($found) {
                        $student->section = $found['section'] ?? null;
                        $student->adviser = $found['adviser'] ?? null;
                    } else {
                        $student->section = null;
                        $student->adviser = 'Pending Assignment';
                    }
                }
                return $student;
            });
        }

        return response()->json($students);
    }

    /**
     * POST /api/students — Create a new student.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'lrn'     => 'required|string|max:20|unique:students,lrn',
            'name'    => 'required|string|max:150',
            'address' => 'nullable|string|max:255',
            'section' => 'nullable|string|max:100',
            'adviser' => 'nullable|string|max:150',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $student = Student::create([
            'lrn'        => $request->lrn,
            'name'       => $request->name,
            'address'    => $request->address ?? null,
            'section'    => $request->section ?? null,
            'adviser'    => $request->adviser ?? 'Pending Assignment',
            'attendance' => 0,
            'status'     => 'Active',
            'gwa'        => 0,
            'risk'       => 'Pending',
        ]);

        return response()->json($student, 201);
    }

    /**
     * DELETE /api/students/{id} — Delete a student by DB id.
     */
    public function destroy($id)
    {
        $student = Student::findOrFail($id);
        $student->delete();
        return response()->json(['success' => true]);
    }

    /**
     * POST /api/students/bulk-delete — Delete multiple students at once.
     */
    public function bulkDelete(Request $request)
    {
        $ids = $request->input('ids', []);
        if (empty($ids)) {
            return response()->json(['error' => 'No IDs provided'], 400);
        }
        Student::whereIn('id', $ids)->delete();
        return response()->json(['success' => true, 'deleted_count' => count($ids)]);
    }

    /**
     * PUT /api/students/{id} — Update student fields.
     */
    public function update(Request $request, $id)
    {
        $student = Student::findOrFail($id);
        $data = $request->only(['name', 'section', 'adviser', 'attendance', 'status', 'gwa', 'risk']);

        if ($request->has('section') && $request->has('school_year')) {
            $historyRaw = $student->enrollment_history;
            $history = is_string($historyRaw)
                ? json_decode($historyRaw, true)
                : ($historyRaw ?? []);

            $history = array_filter($history, function ($h) use ($request) {
                return isset($h['school_year']) && $h['school_year'] !== $request->school_year;
            });

            if ($request->section) {
                $history[] = [
                    'school_year' => $request->school_year,
                    'section'     => $request->section,
                    'adviser'     => $request->adviser ?? 'Pending Assignment',
                ];
            }

            $data['enrollment_history'] = array_values($history);
        }

        $student->update($data);
        return response()->json($student);
    }

    /**
     * POST /api/students/login — Student login via LRN + password.
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'lrn'      => 'required|string',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $student = Student::where('lrn', $request->lrn)->first();

        if (!$student) {
            return response()->json(['error' => 'Student not found.'], 404);
        }

        // If no password set yet, prompt the frontend to show the set-password screen
        if (!$student->password) {
            return response()->json([
                'needs_password' => true,
                'lrn'  => $student->lrn,
                'name' => $student->name,
            ]);
        }

        if (!Hash::check($request->password, $student->password)) {
            return response()->json(['error' => 'Incorrect password.'], 401);
        }

        return response()->json($this->studentPayload($student));
    }

    /**
     * POST /api/students/login-by-lrn — QR login: LRN only, no password required.
     */
    public function loginByLrn(Request $request)
    {
        $validator = Validator::make($request->all(), ['lrn' => 'required|string']);
        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $student = Student::where('lrn', $request->lrn)->first();
        if (!$student) {
            return response()->json(['error' => 'Student not found.'], 404);
        }

        // If the student has a QR PIN set up, demand verification instead of auto-login
        if ($student->qr_pin) {
            return response()->json([
                'requires_pin' => true,
                'lrn'          => $student->lrn,
                'name'         => $student->name,
                'profile_picture' => $student->profile_picture,
            ]);
        }

        return response()->json($this->studentPayload($student));
    }

    /**
     * POST /api/students/verify-qr-pin — Verify the 6-digit PIN for QR login.
     */
    public function verifyQrPin(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'lrn' => 'required|string',
            'pin' => 'required|string|digits:6'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $student = Student::where('lrn', $request->lrn)->first();

        if (!$student || !Hash::check($request->pin, $student->qr_pin)) {
            return response()->json(['error' => 'Invalid PIN.'], 401);
        }

        return response()->json($this->studentPayload($student));
    }

    /**
     * POST /api/students/setup-qr-pin — Set up their initial QR PIN.
     */
    public function setupQrPin(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'lrn' => 'required|string',
            'pin' => 'required|string|digits:6'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $student = Student::where('lrn', $request->lrn)->first();
        if (!$student) {
            return response()->json(['error' => "Access Denied: Student record for LRN {$request->lrn} not found."], 404);
        }

        try {
            $student->update(['qr_pin' => Hash::make($request->pin)]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Database Error: Could not save your PIN. ' . $e->getMessage()], 500);
        }

        return response()->json(['success' => true]);
    }

    /**
     * POST /api/students/set-password — Set or change a student's password.
     */
    public function setPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'lrn'      => 'required|string',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $student = Student::where('lrn', $request->lrn)->firstOrFail();
        $student->update([
            'password' => Hash::make($request->password),
            'plain_password' => $request->password,
        ]);

        return response()->json([
            'success' => true,
            'plain_password' => $request->password
        ]);
    }

    /**
     * POST /api/students/update-password — Student changing their password from dashboard.
     */
    public function updatePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'lrn'      => 'required|string',
            'old_password' => 'nullable|string',
            'new_password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $student = Student::where('lrn', $request->lrn)->firstOrFail();
        
        if ($student->password && !Hash::check($request->old_password, $student->password)) {
            return response()->json(['error' => 'Incorrect old password.'], 401);
        }

        $student->update([
            'password' => Hash::make($request->new_password),
            'plain_password' => $request->new_password,
        ]);

        return response()->json([
            'success' => true,
            'plain_password' => $request->new_password
        ]);
    }

    /**
     * POST /api/students/upload-profile — Handle student profile picture upload.
     */
    public function uploadProfilePicture(Request $request)
    {
        $request->validate([
            'id'    => 'required|integer',  // Db ID
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:10240',
        ]);

        $student = Student::findOrFail($request->id);

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $data = file_get_contents($file->getRealPath());
            $base64 = 'data:image/' . $file->getClientOriginalExtension() . ';base64,' . base64_encode($data);

            $student->update(['profile_picture' => $base64]);

            return response()->json([
                'success' => true,
                'path'    => $base64
            ]);
        }

        return response()->json(['error' => 'No file uploaded'], 400);
    }

    /**
     * GET /api/students/statistics — Return enrollment stats for dashboards.
     */
    public function statistics(Request $request)
    {
        $schoolYear = $request->query('school_year', '2025-2026');
        $students = Student::all();

        $stats = [
            'total_enrolled' => 0,
            'by_grade_level' => [
                'Grade 7' => 0, 'Grade 8' => 0, 'Grade 9' => 0, 
                'Grade 10' => 0, 'Grade 11' => 0, 'Grade 12' => 0
            ],
            'by_section' => []
        ];

        foreach ($students as $student) {
            $historyRaw = $student->enrollment_history;
            $history = is_string($historyRaw) ? json_decode($historyRaw, true) : $historyRaw;
            
            $section = null;
            if (is_array($history)) {
                $found = collect($history)->firstWhere('school_year', $schoolYear);
                if ($found) {
                    $section = $found['section'] ?? null;
                }
            }
            if (!$section && $schoolYear === '2025-2026') {
                $section = $student->section; // Fallback to current section if active year
            }

            if ($section) {
                $stats['total_enrolled']++;
                
                // Approximate grade level from section
                $grade = 'Other';
                if (preg_match('/Grade (\d+)/i', $section, $m) || preg_match('/Gr (\d+)/i', $section, $m)) {
                    $grade = 'Grade ' . $m[1];
                } elseif (preg_match('/STEM|HUMSS|ABM|GAS|TVL|ICT/i', $section)) {
                    $grade = 'Grade 11/12'; // General fallback
                    if (str_contains(strtolower($section), '11')) $grade = 'Grade 11';
                    if (str_contains(strtolower($section), '12')) $grade = 'Grade 12';
                }
                
                if (isset($stats['by_grade_level'][$grade])) {
                    $stats['by_grade_level'][$grade]++;
                } else {
                    $stats['by_grade_level'][$grade] = 1;
                }

                if (!isset($stats['by_section'][$section])) {
                    $stats['by_section'][$section] = 0;
                }
                $stats['by_section'][$section]++;
            }
        }

        return response()->json($stats);
    }

    /** Build a safe JSON payload for a logged-in student. */
    private function studentPayload(Student $s): array
    {
        return [
            'id'                 => $s->id,
            'lrn'                => $s->lrn,
            'name'               => $s->name,
            'section'            => $s->section,
            'adviser'            => $s->adviser,
            'gwa'                => $s->gwa,
            'risk'               => $s->risk,
            'status'             => $s->status,
            'enrollment_history' => $s->enrollment_history,
            'profile_picture'    => $s->profile_picture,
            'has_qr_pin'         => !empty($s->qr_pin),
            'plain_password'     => $s->plain_password,
        ];
    }
}
