const fs = require('fs');

const file = 'd:/practice/practice/ai-driven/public/js/student/dashboard.js';
let content = fs.readFileSync(file, 'utf8');

const targetLogic = /fetch\(\`\/api\/attendance\/\$\{lrn\}\`\)\s*\.then\(r => r\.ok \? r\.json\(\) : \[\]\)\s*\.then\(attData => \{\s*let totalMarks = 0;\s*let presentMarks = 0;\s*\/\/ Filter attendance to the targeted school year if provided\s*const yearlyAtt = syTarget \? attData\.filter\(a => a\.school_year === syTarget\) : attData;\s*yearlyAtt\.forEach\(row => \{\s*if \(row\.school_days && row\.school_days > 0\) \{\s*totalMarks \+= parseInt\(row\.school_days\) \|\| 0;\s*presentMarks \+= parseInt\(row\.days_present\) \|\| 0;\s*\} else \{\s*\/\/ fallback to parsing daily_marks if school_days is 0 but daily_marks exist\s*let marks = row\.daily_marks \|\| row\.marks;\s*if \(typeof marks === 'string'\) \{\s*try \{ marks = JSON\.parse\(marks\); \} catch\(e\) \{\}\s*\}\s*if \(marks && Array\.isArray\(marks\)\) \{\s*marks\.forEach\(m => \{\s*if \(m === '\/' \|\| \(m && m\.toLowerCase\(\) === 'p'\)\) presentMarks\+\+;\s*if \(m !== '' && m !== null\) totalMarks\+\+;\s*\}\);\s*\}\s*\}\s*\}\);\s*if \(totalMarks > 0\) \{\s*const pct = \(\(presentMarks \/ totalMarks\) \* 100\)\.toFixed\(2\);\s*document\.getElementById\('student-attendance'\)\.innerText = pct;\s*\} else \{\s*document\.getElementById\('student-attendance'\)\.innerText = "--"; \s*\}\s*\}\)\s*\.catch\(\(\) => \{\s*document\.getElementById\('student-attendance'\)\.innerText = "--";\s*\}\);/s;

const newLogic = `fetch(\`/api/attendance/\${lrn}\`)
            .then(r => r.ok ? r.json() : [])
            .then(attData => {
                let totalMarks = 0;
                let presentMarks = 0;
                
                const yearlyAtt = syTarget ? attData.filter(a => a.school_year === syTarget) : attData;

                yearlyAtt.forEach(row => {
                    // Force them as integers
                    let sd = parseInt(row.school_days);
                    let dp = parseInt(row.days_present);
                    
                    if (!isNaN(sd) && sd > 0) {
                        totalMarks += sd;
                        presentMarks += (!isNaN(dp) ? dp : 0);
                    } else {
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
                });
                
                if (totalMarks > 0) {
                    const pct = ((presentMarks / totalMarks) * 100).toFixed(2);
                    document.getElementById('student-attendance').innerText = pct;
                } else if (window.studentData && window.studentData.attendance > 0) {
                    // Fallback to the precomputed DB value if calculation somehow fails or yields 0 totalMarks
                    document.getElementById('student-attendance').innerText = parseFloat(window.studentData.attendance).toFixed(2);
                } else {
                    document.getElementById('student-attendance').innerText = "--"; 
                }
            })
            .catch((err) => {
                console.error("Attendance fetch error:", err);
                if (window.studentData && window.studentData.attendance > 0) {
                    document.getElementById('student-attendance').innerText = parseFloat(window.studentData.attendance).toFixed(2);
                } else {
                    document.getElementById('student-attendance').innerText = "--";
                }
            });`;

if (content.match(targetLogic)) {
    content = content.replace(targetLogic, newLogic);
    fs.writeFileSync(file, content);
    console.log("Patched student dashboard attendance fallback successfully.");
} else {
    console.log("Regex did not match student dashboard attendance logic.");
}
