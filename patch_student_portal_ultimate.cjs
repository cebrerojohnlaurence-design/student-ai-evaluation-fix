const fs = require('fs');

const file = 'd:/practice/practice/ai-driven/public/js/student/dashboard.js';
let content = fs.readFileSync(file, 'utf8');

const targetLogic = /if \(totalMarks > 0\) \{\s*const pct = \(\(presentMarks \/ totalMarks\) \* 100\)\.toFixed\(2\);\s*document\.getElementById\('student-attendance'\)\.innerText = pct;\s*\} else if \([^\}]+\) \{\s*document\.getElementById\('student-attendance'\)\.innerText = [^;]+;\s*\} else \{\s*document\.getElementById\('student-attendance'\)\.innerText = "--";\s*\}/g;

const newLogic = `if (totalMarks > 0) {
                    const pct = ((presentMarks / totalMarks) * 100).toFixed(2);
                    document.getElementById('student-attendance').innerText = pct;
                } else if (window.studentData && window.studentData.attendance !== null && window.studentData.attendance !== undefined) {
                    document.getElementById('student-attendance').innerText = parseFloat(window.studentData.attendance).toFixed(2);
                } else {
                    // ULTIMATE FALLBACK: fetch directly from the main students API where we know it works
                    fetch('/api/students')
                        .then(res => res.json())
                        .then(allStudents => {
                            const me = allStudents.find(s => s.lrn === lrn);
                            if (me && me.attendance !== null && me.attendance !== undefined && parseFloat(me.attendance) >= 0) {
                                document.getElementById('student-attendance').innerText = parseFloat(me.attendance).toFixed(2);
                            } else {
                                document.getElementById('student-attendance').innerText = "--";
                            }
                        })
                        .catch(() => {
                            document.getElementById('student-attendance').innerText = "--"; 
                        });
                }`;

if (content.match(targetLogic)) {
    content = content.replace(targetLogic, newLogic);
    
    // Also patch the catch block just in case
    const catchLogic = /\.catch\(\(err\) => \{\s*console\.error\("Attendance fetch error:", err\);\s*if \([^}]+\) \{\s*document\.getElementById\('student-attendance'\)\.innerText = [^;]+;\s*\} else \{\s*document\.getElementById\('student-attendance'\)\.innerText = "--";\s*\}\s*\}\);/g;
    
    const newCatchLogic = `.catch((err) => {
                console.error("Attendance fetch error:", err);
                fetch('/api/students')
                    .then(res => res.json())
                    .then(allStudents => {
                        const me = allStudents.find(s => s.lrn === lrn);
                        if (me && me.attendance !== null && me.attendance !== undefined && parseFloat(me.attendance) >= 0) {
                            document.getElementById('student-attendance').innerText = parseFloat(me.attendance).toFixed(2);
                        } else {
                            document.getElementById('student-attendance').innerText = "--";
                        }
                    })
                    .catch(() => {
                        document.getElementById('student-attendance').innerText = "--"; 
                    });
            });`;
            
    if (content.match(catchLogic)) {
        content = content.replace(catchLogic, newCatchLogic);
    }
    
    fs.writeFileSync(file, content);
    console.log("Patched ultimate fallback successfully.");
} else {
    console.log("Could not match the target logic for ultimate fallback.");
}
