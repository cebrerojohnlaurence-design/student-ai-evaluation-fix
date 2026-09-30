const fs = require('fs');

const file = 'd:/practice/practice/ai-driven/public/js/student/dashboard.js';
let content = fs.readFileSync(file, 'utf8');

const targetLogic = /else if \(window\.studentData && window\.studentData\.attendance > 0\) \{\s*\/\/ Fallback to the precomputed DB value if calculation somehow fails or yields 0 totalMarks\s*document\.getElementById\('student-attendance'\)\.innerText = parseFloat\(window\.studentData\.attendance\)\.toFixed\(2\);\s*\}/g;

const newLogic = `else if (window.studentData && window.studentData.attendance !== null && window.studentData.attendance !== undefined) {
                    document.getElementById('student-attendance').innerText = parseFloat(window.studentData.attendance).toFixed(2);
                }`;

if (content.match(targetLogic)) {
    content = content.replace(targetLogic, newLogic);
    
    // Replace the error block one too
    const targetErrorLogic = /if \(window\.studentData && window\.studentData\.attendance > 0\) \{\s*document\.getElementById\('student-attendance'\)\.innerText = parseFloat\(window\.studentData\.attendance\)\.toFixed\(2\);\s*\}/g;
    
    const newErrorLogic = `if (window.studentData && window.studentData.attendance !== null && window.studentData.attendance !== undefined) {
                    document.getElementById('student-attendance').innerText = parseFloat(window.studentData.attendance).toFixed(2);
                }`;
    
    content = content.replace(targetErrorLogic, newErrorLogic);
    
    fs.writeFileSync(file, content);
    console.log("Patched zero-attendance condition successfully.");
} else {
    console.log("Could not match the attendance > 0 condition.");
}
