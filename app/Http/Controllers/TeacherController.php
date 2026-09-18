<?php

namespace App\Http\Controllers;

use App\Models\Teacher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class TeacherController extends Controller
{
    /**
     * Teacher Dashboard page.
     */
    public function dashboard()
    {
        return view('teacher.dashboard');
    }

    /**
     * Teacher Activity Logs page.
     */
    public function activityLogs()
    {
        return view('teacher.activityLogs');
    }

    /**
     * Add Students page (teacher view).
     */
    public function addStudents()
    {
        return view('teacher.addStudents');
    }

    /**
     * Grading / Records page.
     */
    public function records()
    {
        return view('teacher.records');
    }

    /**
     * Settings page.
     */
    public function settings()
    {
        return view('teacher.settings');
    }



    // ─── API Methods ────────────────────────────────────────────────────────────

    /**
     * GET /api/teachers — Return all teachers as JSON (password hidden).
     */
    public function index(Request $request)
    {
        $schoolYear = $request->query('school_year');
        $teachers = Teacher::orderBy('name')->get()->map(function ($t) use ($schoolYear) {
            
            if ($schoolYear && $t->assignment_history) {
                $history = is_string($t->assignment_history) ? json_decode($t->assignment_history, true) : $t->assignment_history;
                if (is_array($history)) {
                    $found = collect($history)->firstWhere('school_year', $schoolYear);
                    if ($found) {
                        $t->section = $found['section'] ?? null;
                        $t->subject = $found['subject'] ?? null;
                        $t->level = $found['level'] ?? null;
                        $t->strand = $found['strand'] ?? null;
                    } else {
                        $t->section = null;
                        $t->subject = null;
                        $t->level = 'JH';
                        $t->strand = null;
                    }
                }
            }

            return [
                'id'         => $t->teacher_id,
                'db_id'      => $t->id,
                'name'       => $t->name,
                'user'       => $t->username,
                'subject'    => $t->subject,
                'is_adviser' => (bool) $t->is_adviser,
                'section'    => $t->section,
                'level'      => $t->level ?? 'JH',
                'strand'     => $t->strand,
                'profile_picture' => $t->profile_picture,
                'assignment_history' => is_string($t->assignment_history) ? json_decode($t->assignment_history, true) : $t->assignment_history
            ];
        });
        return response()->json($teachers);
    }

    /**
     * POST /api/teachers — Create a new teacher.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name'       => 'required|string|max:150',
            'username'   => 'required|string|max:80|unique:teachers,username',
            'password'   => 'required|string|min:6',
            'subject'    => 'nullable|string|max:200',
            'is_adviser' => 'nullable|boolean',
            'section'    => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        // Auto-generate teacher_id: T-001, T-002, …
        $count = Teacher::count() + 1;
        $teacherId = 'T-' . str_pad($count, 3, '0', STR_PAD_LEFT);

        // Ensure unique teacher_id
        while (Teacher::where('teacher_id', $teacherId)->exists()) {
            $count++;
            $teacherId = 'T-' . str_pad($count, 3, '0', STR_PAD_LEFT);
        }

        $teacher = Teacher::create([
            'teacher_id' => $teacherId,
            'name'       => $request->name,
            'username'   => $request->username,
            'password'   => Hash::make($request->password),
            'subject'    => $request->subject ?? null,
            'level'      => $request->level ?? 'JH',
            'strand'     => $request->strand ?? null,
            'is_adviser' => $request->is_adviser ?? false,
            'section'    => $request->section ?? null,
        ]);

        return response()->json([
            'id'         => $teacher->teacher_id,
            'db_id'      => $teacher->id,
            'name'       => $teacher->name,
            'user'       => $teacher->username,
            'subject'    => $teacher->subject,
            'is_adviser' => (bool) $teacher->is_adviser,
            'section'    => $teacher->section,
            'level'      => $teacher->level ?? 'JH',
            'strand'     => $teacher->strand,
            'profile_picture' => $teacher->profile_picture,
            'has_qr_pin' => !empty($teacher->qr_pin),
        ], 201);
    }

    /**
     * PUT /api/teachers/{id} — Update a teacher (db id).
     */
    public function update(Request $request, $id)
    {
        $teacher = Teacher::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name'       => 'sometimes|string|max:150',
            'username'   => 'sometimes|string|max:80|unique:teachers,username,' . $id,
            'password'   => 'sometimes|nullable|string|min:6',
            'subject'    => 'sometimes|nullable|string|max:200',
            'is_adviser' => 'sometimes|boolean',
            'section'    => 'sometimes|nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $data = $request->only(['name', 'username', 'subject', 'level', 'strand', 'is_adviser', 'section']);
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        if ($request->has('school_year')) {
            $history = is_string($teacher->assignment_history) ? json_decode($teacher->assignment_history, true) : ($teacher->assignment_history ?? []);
            
            $history = array_filter($history, function($h) use ($request) {
                return isset($h['school_year']) && $h['school_year'] !== $request->school_year;
            });
            
            $history[] = [
                'school_year' => $request->school_year,
                'section' => $request->section,
                'subject' => $request->subject,
                'level' => $request->level,
                'strand' => $request->strand
            ];
            
            $data['assignment_history'] = array_values($history);
        }

        $teacher->update($data);

        return response()->json([
            'id'         => $teacher->teacher_id,
            'db_id'      => $teacher->id,
            'name'       => $teacher->name,
            'user'       => $teacher->username,
            'subject'    => $teacher->subject,
            'is_adviser' => (bool) $teacher->is_adviser,
            'section'    => $teacher->section,
            'level'      => $teacher->level ?? 'JH',
            'strand'     => $teacher->strand,
            'profile_picture' => $teacher->profile_picture,
            'assignment_history' => is_string($teacher->assignment_history) ? json_decode($teacher->assignment_history, true) : $teacher->assignment_history,
            'has_qr_pin' => !empty($teacher->qr_pin),
        ]);
    }

    /**
     * DELETE /api/teachers/{id} — Delete a teacher (db id).
     */
    public function destroy($id)
    {
        $teacher = Teacher::findOrFail($id);
        $teacher->delete();
        return response()->json(['success' => true]);
    }

    /**
     * POST /api/teachers/login — Validate teacher credentials for JS login.
     */
    public function login(Request $request)
    {
        $teacher = Teacher::where('username', $request->username)->first();

        if (!$teacher || !Hash::check($request->password, $teacher->password)) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        return response()->json([
            'id'         => $teacher->teacher_id,
            'db_id'      => $teacher->id,
            'name'       => $teacher->name,
            'user'       => $teacher->username,
            'subject'    => $teacher->subject,
            'is_adviser' => (bool) $teacher->is_adviser,
            'section'    => $teacher->section,
            'level'      => $teacher->level ?? 'JH',
            'strand'     => $teacher->strand,
            'profile_picture' => $teacher->profile_picture,
            'has_qr_pin' => !empty($teacher->qr_pin),
        ]);
    }

    /**
     * POST /api/teachers/login-by-id — QR login: Teacher ID only.
     */
    public function loginById(Request $request)
    {
        $validator = Validator::make($request->all(), ['teacher_id' => 'required|string']);
        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $teacher = Teacher::where('teacher_id', $request->teacher_id)->first();
        if (!$teacher) {
            return response()->json(['error' => 'Teacher not found.'], 404);
        }

        if ($teacher->qr_pin) {
            return response()->json([
                'requires_pin' => true,
                'teacher_id'   => $teacher->teacher_id,
                'name'         => $teacher->name,
                'profile_picture' => $teacher->profile_picture,
            ]);
        }

        return response()->json([
            'id'         => $teacher->teacher_id,
            'db_id'      => $teacher->id,
            'name'       => $teacher->name,
            'user'       => $teacher->username,
            'subject'    => $teacher->subject,
            'is_adviser' => (bool) $teacher->is_adviser,
            'section'    => $teacher->section,
            'level'      => $teacher->level ?? 'JH',
            'strand'     => $teacher->strand,
            'profile_picture' => $teacher->profile_picture,
            'has_qr_pin' => !empty($teacher->qr_pin),
        ]);
    }

    /**
     * POST /api/teachers/verify-qr-pin
     */
    public function verifyQrPin(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'teacher_id' => 'required|string',
            'pin' => 'required|string|digits:6'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $teacher = Teacher::where('teacher_id', $request->teacher_id)->first();

        if (!$teacher || !Hash::check($request->pin, $teacher->qr_pin)) {
            return response()->json(['error' => 'Invalid PIN.'], 401);
        }

        return response()->json([
            'id'         => $teacher->teacher_id,
            'db_id'      => $teacher->id,
            'name'       => $teacher->name,
            'user'       => $teacher->username,
            'subject'    => $teacher->subject,
            'is_adviser' => (bool) $teacher->is_adviser,
            'section'    => $teacher->section,
            'level'      => $teacher->level ?? 'JH',
            'strand'     => $teacher->strand,
            'profile_picture' => $teacher->profile_picture,
            'has_qr_pin' => true,
        ]);
    }

    /**
     * POST /api/teachers/setup-qr-pin
     */
    public function setupQrPin(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'teacher_id' => 'required|string',
            'pin' => 'required|string|digits:6'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $teacher = Teacher::where('teacher_id', $request->teacher_id)->firstOrFail();
        $teacher->update(['qr_pin' => Hash::make($request->pin)]);

        return response()->json(['success' => true]);
    }

    /**
     * POST /api/teachers/change-password — Allow teacher to change their own password.
     */
    public function changePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id'               => 'required|integer',
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:6',
            'confirm_password' => 'required|string|same:new_password',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $teacher = Teacher::findOrFail($request->id);

        if (!Hash::check($request->current_password, $teacher->password)) {
            return response()->json(['error' => 'Current password matches incorrectly.'], 403);
        }

        $teacher->update([
            'password' => Hash::make($request->new_password)
        ]);

        return response()->json(['success' => true, 'message' => 'Password updated successfully.']);
    }

    /**
     * POST /api/teachers/upload-profile — Accept base64 image JSON and store directly.
     */
    public function uploadProfilePicture(Request $request)
    {
        try {
            $request->validate([
                'id'           => 'required|integer',
                'image_base64' => 'required|string',
            ]);

            $teacher = Teacher::findOrFail($request->id);
            $teacher->update(['profile_picture' => $request->image_base64]);

            return response()->json(['success' => true, 'path' => $request->image_base64]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['error' => collect($e->errors())->flatten()->first()], 422);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Server error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/teachers/submitted-grades — Return teachers and whether they've encoded grades.
     */
    public function submittedGrades(Request $request)
    {
        $schoolYear = $request->query('school_year', '2025-2026');
        
        $teachers = Teacher::all()->map(function ($t) use ($schoolYear) {
            $section = $t->section;
            $subject = $t->subject;
            
            if ($schoolYear && $t->assignment_history) {
                $history = is_string($t->assignment_history) ? json_decode($t->assignment_history, true) : $t->assignment_history;
                if (is_array($history)) {
                    $found = collect($history)->firstWhere('school_year', $schoolYear);
                    if ($found) {
                        $section = $found['section'] ?? null;
                        $subject = $found['subject'] ?? null;
                    }
                }
            }

            if (!$section || !$subject) {
                return null; // Not teaching a subject/section this year
            }

            // Check if any student in this section has grades for this subject
            $hasGrades = \App\Models\StudentSubject::where('subject_name', $subject)
                ->where('school_year', $schoolYear)
                ->whereHas('student', function ($query) use ($section, $schoolYear) {
                    // This is an approximation. If the student is in this section for this school_year
                    $query->where('section', $section); // Note: Should ideally check enrollment_history for accuracy
                })
                ->whereNotNull('grade')
                ->exists();

            return [
                'name' => $t->name,
                'section' => $section,
                'subject' => $subject,
                'status' => $hasGrades ? 'Submitted' : 'Pending',
                'is_adviser' => (bool)$t->is_adviser
            ];
        })->filter()->values();

        return response()->json($teachers);
    }
}

