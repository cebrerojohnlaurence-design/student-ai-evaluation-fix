const fs = require('fs');
const file = 'd:/practice/practice/ai-driven/public/js/student/dashboard.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /yearlyAtt\.forEach\(row => \{\s*if \(row\.marks && Array\.isArray\(row\.marks\)\) \{\s*row\.marks\.forEach\(m => \{\s*if \(m === '\/'\) presentMarks\+\+;\s*if \(m !== ''\) totalMarks\+\+;\s*\}\);\s*\}\s*\}\);/g;

const newLogic = `yearlyAtt.forEach(row => {
                    if (row.school_days && row.school_days > 0) {
                        totalMarks += parseInt(row.school_days) || 0;
                        presentMarks += parseInt(row.days_present) || 0;
                    } else {
                        // fallback to parsing daily_marks if school_days is 0 but daily_marks exist
                        let marks = row.daily_marks || row.marks;
                        if (typeof marks === 'string') {
                            try { marks = JSON.parse(marks); } catch(e) {}
                        }
                        if (marks && Array.isArray(marks)) {
                            marks.forEach(m => {
                                if (m === '/' || (m && m.toLowerCase() === 'p')) presentMarks++;
                                if (m !== '' && m !== null) totalMarks++;
                            });
                        }
                    }
                });`;

if (content.match(regex)) {
    content = content.replace(regex, newLogic);
    
    // Also, update the display logic to match exactly what admin sees (e.g. 2 decimal places if needed)
    // The admin displays it as 94.15% so toFixed(2) is better.
    const displayRegex = /if \(totalMarks > 0\) \{\s*const pct = \(\(presentMarks \/ totalMarks\) \* 100\)\.toFixed\(0\);\s*document\.getElementById\('student-attendance'\)\.innerText = pct;\s*\} else \{\s*document\.getElementById\('student-attendance'\)\.innerText = "--";\s*\}/g;
    
    const newDisplay = `if (totalMarks > 0) {
                    const pct = ((presentMarks / totalMarks) * 100).toFixed(2);
                    document.getElementById('student-attendance').innerText = pct;
                } else {
                    document.getElementById('student-attendance').innerText = "--"; 
                }`;
    
    content = content.replace(displayRegex, newDisplay);
    
    fs.writeFileSync(file, content);
    console.log("Successfully patched student/dashboard.js for attendance calculation.");
} else {
    console.log("Regex did not match dashboard.js");
}
