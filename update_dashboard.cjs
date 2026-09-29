const fs = require('fs');
const file = 'd:/practice/practice/ai-driven/public/js/admin/dashboard.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Add getStudentGradeNumber helper
const helperCode = `
function getStudentGradeNumber(s) {
    if (!s.section) return null;
    let m = s.section.match(/\\b([7-9]|1[0-2])\\b/);
    if (m) return parseInt(m[1]);
    try {
        const savedSections = JSON.parse(localStorage.getItem('cnhs_sections') || '[]');
        const secData = savedSections.find(x => x.name === s.section);
        if (secData && secData.year) {
            let m2 = secData.year.match(/\\b([7-9]|1[0-2])\\b/);
            if (m2) return parseInt(m2[1]);
        }
    } catch(e) {}
    if (typeof teachers !== 'undefined') {
        const adv = teachers.find(t => t.is_adviser && (t.section || '').split(',').map(x => x.trim().toLowerCase()).includes(s.section.toLowerCase()));
        if (adv) return adv.level === 'SH' ? 11 : 7;
    }
    return null;
}
`;
if (!content.includes('function getStudentGradeNumber')) {
    content = content.replace('function getFilteredDashboardStudents() {', helperCode + '\nfunction getFilteredDashboardStudents() {');
}

// 2. Replace grade parsing logic with helper in various places
content = content.replace(/const match = \(s\.section \|\| ''\)\.match\(\/\\b\(\[7-9\]\|1\[0-2\]\)\\b\/\);\s*return m && m\[1\] === check;/g, "const gNum = getStudentGradeNumber(s);\n            return gNum && gNum.toString() === check;");
content = content.replace(/let isSH = false;\s*let isJH = false;\s*if \(s\.section\) \{\s*const match = s\.section\.match\(\/\\b\(\[7-9\]\|1\[0-2\]\)\\b\/\);\s*if \(match\) \{\s*const val = parseInt\(match\[1\]\);\s*if \(val >= 11\) isSH = true;\s*if \(val <= 10\) isJH = true;\s*\}\s*\}/g, "let isSH = false;\n        let isJH = false;\n        const gNum = getStudentGradeNumber(s);\n        if (gNum) {\n            if (gNum >= 11) isSH = true;\n            if (gNum <= 10) isJH = true;\n        }");
content = content.replace(/let isSH = false;\s*if \(s\.section\) \{\s*const match = s\.section\.match\(\/\\b\(\[7-9\]\|1\[0-2\]\)\\b\/\);\s*if \(match && parseInt\(match\[1\]\) >= 11\) isSH = true;\s*\}/g, "let isSH = false;\n            const gNum = getStudentGradeNumber(s);\n            if (gNum && gNum >= 11) isSH = true;");
content = content.replace(/const check = modalGradeLevel\.replace\('Grade ', ''\);\s*filtered = filtered\.filter\(s => \{\s*const m = \(s\.section \|\| ''\)\.match\(\/\\b\(\[7-9\]\|1\[0-2\]\)\\b\/\);\s*return m && m\[1\] === check;\s*\}\);/g, "const check = modalGradeLevel.replace('Grade ', '');\n        filtered = filtered.filter(s => {\n            const gNum = getStudentGradeNumber(s);\n            return gNum && gNum.toString() === check;\n        });");


// 3. Fix s.grades to s.subjects
content = content.replace(/s\.grades && Object\.keys\(s\.grades\)\.length >= 8/g, "s.subjects && s.subjects.filter(sub => sub.g !== null).length >= 8");
content = content.replace(/const hasFailing = s\.grades && Object\.values\(s\.grades\)\.some\(g => parseFloat\(g\) < 75\);/g, "const hasFailing = s.subjects && s.subjects.some(sub => parseFloat(sub.g) < 75);");
content = content.replace(/let hasFailingSubject = false;\s*if \(s\.grades\) \{\s*hasFailingSubject = Object\.values\(s\.grades\)\.some\(g => parseFloat\(g\) < 75\);\s*\}/g, "let hasFailingSubject = false;\n        if (s.subjects) {\n             hasFailingSubject = s.subjects.some(sub => parseFloat(sub.g) < 75);\n        }");

// Fix showAtRiskReason
content = content.replace(/let failingSubjects = \[\];\s*if \(student\.grades\) \{\s*Object\.keys\(student\.grades\)\.forEach\(sub => \{\s*const grade = parseFloat\(student\.grades\[sub\]\);\s*if \(grade < 75\) \{\s*failingSubjects\.push\(\{ subject: sub, grade: grade \}\);\s*\}\s*\}\);\s*\}/g, `let failingSubjects = [];
    if (student.subjects) {
        student.subjects.forEach(subObj => {
            if (subObj.g !== null) {
                const grade = parseFloat(subObj.g);
                if (grade < 75) {
                    failingSubjects.push({ subject: subObj.n, grade: grade });
                }
            }
        });
    }`);

// Fix showStudentSummaryModal
content = content.replace(/\$\{student\.grades \? Object\.keys\(student\.grades\)\.length : 0\} Subjects Recorded/g, "${student.subjects ? student.subjects.filter(sub => sub.g !== null).length : 0} Subjects Recorded");
content = content.replace(/\$\{student\.grades && Object\.keys\(student\.grades\)\.length > 0 \n*\s*\?\s*Object\.entries\(student\.grades\)\.map\(\(\[sub, grade\]\) => \{/g, "${student.subjects && student.subjects.filter(sub => sub.g !== null).length > 0 ? student.subjects.filter(sub => sub.g !== null).map(subObj => { const sub = subObj.n; const grade = subObj.g;");

fs.writeFileSync(file, content);
console.log('Update complete');
