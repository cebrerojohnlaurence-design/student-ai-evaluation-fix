const fs = require('fs');
const file = 'd:/practice/practice/ai-driven/app/Http/Controllers/StudentController.php';
let content = fs.readFileSync(file, 'utf8');

const regex = /\$student = Student::create\(\[\s*'lrn'[\s\S]*?'enrollment_history' => \$history,\s*\]\);/;

const replacement = `try {
            $student = Student::create([
                'lrn'                => $request->lrn,
                'name'               => $request->name,
                'address'            => $request->address ?? null,
                'section'            => $request->section ?? null,
                'adviser'            => $request->adviser ?? 'Pending Assignment',
                'attendance'         => 0,
                'status'             => 'Active',
                'gwa'                => 0,
                'risk'               => 'Pending',
                'enrollment_history' => $history,
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Database Insert Error: ' . $e->getMessage()], 500);
        }`;

if (content.match(regex)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content);
    console.log('Patched StudentController.php with try/catch.');
} else {
    console.log('Regex failed in StudentController.php');
}
