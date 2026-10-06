<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Student;
use App\Models\StudentSubject;

class StudentSubjectController extends Controller
{
    /**
     * GET /api/students/{lrn}/subjects
     * Return all subject score rows for a student.
     * Optional ?quarter=1..4 to filter by quarter.
     */
    public function index(string $lrn, Request $request)
    {
        $student = Student::where('lrn', $lrn)->firstOrFail();

        $query = StudentSubject::where('student_id', $student->id);

        if ($request->has('quarter')) {
            $query->where('quarter', (int) $request->quarter);
        }

        if ($request->has('school_year') && !empty($request->school_year)) {
            $sy = $request->school_year;
            $query->where(function ($q) use ($sy) {
                $q->where('school_year', $sy);
                if ($sy === '2025-2026') {
                    $q->orWhereNull('school_year')->orWhere('school_year', '');
                }
            });
        }

        $rows = $query->get()->map(function ($row) {
            return [
                'n'           => $row->subject_name,
                'quarter'     => $row->quarter,
                'school_year' => $row->school_year ?: '2025-2026',
                'ww1'     => $row->ww1,  'ww2' => $row->ww2,  'ww3' => $row->ww3,
                'ww4'     => $row->ww4,  'ww5' => $row->ww5,  'ww6' => $row->ww6,
                'ww7'     => $row->ww7,  'ww8' => $row->ww8,  'ww9' => $row->ww9,
                'ww10'    => $row->ww10,
                'pt1'     => $row->pt1,  'pt2' => $row->pt2,  'pt3' => $row->pt3,
                'pt4'     => $row->pt4,  'pt5' => $row->pt5,  'pt6' => $row->pt6,
                'pt7'     => $row->pt7,  'pt8' => $row->pt8,  'pt9' => $row->pt9,
                'pt10'    => $row->pt10,
                'qa'      => $row->qa,
                'g'       => $row->grade,
            ];
        });

        if ($request->has('with_name')) {
            $attendances = $student->attendances()->orderBy('month')->get();

            return response()->json([
                'student_name' => $student->name,
                'section'      => $student->section,
                'attendance_records' => $attendances,
                'attendance'   => $student->attendance, // Fallback for backwards compatibility
                'enrollment_history' => is_string($student->enrollment_history) ? json_decode($student->enrollment_history, true) : $student->enrollment_history,
                'subjects' => $rows
            ]);
        }

        return response()->json($rows);
    }

    /**
     * GET /api/grades/all-subjects
     * Return all subject score rows for all students at once to prevent N+1 fetching delays on frontend.
     */
    public function allSubjects(Request $request)
    {
        $query = StudentSubject::join('students', 'student_subjects.student_id', '=', 'students.id')
            ->select('student_subjects.*', 'students.lrn');

        if ($request->has('school_year') && !empty($request->school_year)) {
            $sy = $request->school_year;
            $query->where(function ($q) use ($sy) {
                $q->where('student_subjects.school_year', $sy);
                if ($sy === '2025-2026') {
                    $q->orWhereNull('student_subjects.school_year')->orWhere('student_subjects.school_year', '');
                }
            });
        }

        $rows = $query->get()->map(function ($row) {
            return [
                'lrn'         => $row->lrn,
                'n'           => $row->subject_name,
                'quarter'     => $row->quarter,
                'school_year' => $row->school_year ?: '2025-2026',
                'ww1'     => $row->ww1,  'ww2' => $row->ww2,  'ww3' => $row->ww3,
                'ww4'     => $row->ww4,  'ww5' => $row->ww5,  'ww6' => $row->ww6,
                'ww7'     => $row->ww7,  'ww8' => $row->ww8,  'ww9' => $row->ww9,
                'ww10'    => $row->ww10,
                'pt1'     => $row->pt1,  'pt2' => $row->pt2,  'pt3' => $row->pt3,
                'pt4'     => $row->pt4,  'pt5' => $row->pt5,  'pt6' => $row->pt6,
                'pt7'     => $row->pt7,  'pt8' => $row->pt8,  'pt9' => $row->pt9,
                'pt10'    => $row->pt10,
                'qa'      => $row->qa,
                'g'       => $row->grade,
            ];
        });

        return response()->json($rows);
    }

    /**
     * POST /api/grades/save
     * Upsert subject scores for a student (called when teacher types into a cell).
     * Body: { lrn, subject, quarter, field, value, grade }
     */
    public function save(Request $request)
    {
        $request->validate([
            'lrn'     => 'required|string',
            'subject' => 'required|string',
            'field'   => 'required|string',
            'value'   => 'nullable|numeric',
            'grade'   => 'nullable|numeric',
            'quarter' => 'nullable|integer|min:1|max:4',
        ]);

        $student = Student::where('lrn', $request->lrn)->firstOrFail();
        $activeSy = \App\Models\Setting::where('key', 'active_sy')->value('value') ?: '2025-2026';
        $schoolYear = !empty($request->school_year) ? $request->school_year : $activeSy;

        $row = StudentSubject::firstOrNew([
            'student_id'   => $student->id,
            'subject_name' => $request->subject,
            'quarter'      => $request->quarter ?? 1,
            'school_year'  => $schoolYear,
        ]);

        $field = $request->field;
        $allowedFields = ['ww1','ww2','ww3','ww4','ww5','ww6','ww7','ww8','ww9','ww10','pt1','pt2','pt3','pt4','pt5','pt6','pt7','pt8','pt9','pt10','qa'];

        if (in_array($field, $allowedFields)) {
            $row->$field = $request->value === '' || $request->value === null ? null : (float) $request->value;
        }

        if ($request->has('grade')) {
            $row->grade = $request->grade === '' || $request->grade === null ? null : (float) $request->grade;
        }

        // Update the student's GWA column too
        if ($request->has('gwa')) {
            $student->gwa = $request->gwa;
            $student->save();
        }

        $row->save();

        return response()->json(['ok' => true]);
    }

    /**
     * POST /api/grades/save-bulk
     * Save a full row of scores for one student/subject at once.
     * Body: { lrn, subject, quarter, scores: { ww1..ww5, pt1..pt5, qa }, grade, gwa }
     */
    public function saveBulk(Request $request)
    {
        $student = Student::where('lrn', $request->lrn)->firstOrFail();

        $quarter = $request->quarter ?? 1;
        $activeSy = \App\Models\Setting::where('key', 'active_sy')->value('value') ?: '2025-2026';
        $schoolYear = !empty($request->school_year) ? $request->school_year : $activeSy;

        $row = StudentSubject::firstOrNew([
            'student_id'   => $student->id,
            'subject_name' => $request->subject,
            'quarter'      => $quarter,
            'school_year'  => $schoolYear,
        ]);

        $scores = $request->scores ?? [];
        foreach (['ww1','ww2','ww3','ww4','ww5','ww6','ww7','ww8','ww9','ww10','pt1','pt2','pt3','pt4','pt5','pt6','pt7','pt8','pt9','pt10','qa'] as $f) {
            if (array_key_exists($f, $scores)) {
                $row->$f = $scores[$f] === '' || $scores[$f] === null ? null : (float) $scores[$f];
            }
        }

        if ($request->has('grade')) {
            $row->grade = $request->grade === '' || $request->grade === null ? null : (float) $request->grade;
        }
        $row->save();

        if ($request->has('gwa')) {
            $student->gwa = $request->gwa;
            $student->save();
        }

        return response()->json(['ok' => true]);
    }

    /**
     * DELETE /api/grades/clear-section
     * Remove all subject grades for every student in the given section + subject.
     * Body: { section, subject, quarter (optional) }
     */
    public function clearSection(Request $request)
    {
        $section = $request->input('section');
        $subject = $request->input('subject');
        $quarter = $request->input('quarter');

        if (!$section || !$subject) {
            return response()->json(['error' => 'section and subject are required'], 422);
        }

        // Get all students in this section
        $students = Student::where('section', $section)->get();
        $subjectList = array_map('trim', explode(',', $subject));

        foreach ($students as $student) {
            $query = StudentSubject::where('student_id', $student->id)
                ->whereIn('subject_name', $subjectList);

            if ($quarter) {
                $query->where('quarter', $quarter);
            }

            $query->delete();

            // Recalculate GWA from remaining subjects
            $remaining = StudentSubject::where('student_id', $student->id)
                ->whereNotNull('grade')
                ->get();

            if ($remaining->count() > 0) {
                $student->gwa = round($remaining->avg('grade'), 2);
            } else {
                $student->gwa = 0;
            }
            $student->save();
        }

        return response()->json(['ok' => true, 'cleared' => $students->count()]);
    }
}