const fs = require('fs');

const file = 'd:/practice/practice/ai-driven/public/js/admin/dashboard.js';
let content = fs.readFileSync(file, 'utf8');

const targetRegex = /const gradeFilter = window\.globalDashGradeFilter \|\| 'All';\s*const sectionFilter = window\.globalDashSectionFilter \|\| 'All';\s*let summaryData = students\.map\(s => \(\{ s: s\.section, g: s\.gwa, a: s\.attendance \}\)\)\.filter\(s => s\.g > 0\);\s*if \(gradeFilter !== 'All'\) \{\s*const check = gradeFilter\.replace\('Grade ', ''\);\s*summaryData = summaryData\.filter\(s => \{\s*const m = \(s\.s \|\| ''\)\.match\(\/\\b\(\[7-9\]\|1\[0-2\]\)\\b\/\);\s*return m && m\[1\] === check;\s*\}\);\s*\}\s*if \(sectionFilter !== 'All'\) \{\s*summaryData = summaryData\.filter\(s => s\.s === sectionFilter\);\s*\}/g;

const newCode = `const gradeFilter = window.globalDashGradeFilter || 'All';
    const sectionFilter = window.globalDashSectionFilter || 'All';
    let filteredStudents = getFilteredDashboardStudents();
    let summaryData = filteredStudents.map(s => ({ s: s.section, g: s.gwa, a: s.attendance })).filter(s => s.g > 0);`;

const promptRegex = /const prompt = `Act as an expert Academic Data Analyst for the 'AI-Driven Student Evaluation System'\. Analyze this student cohort data \(for \$\{scopeText\}\) and provide a concise, 2-to-3 sentence executive summary\. Highlight any notable anomalies, strong performing sections, or areas needing pedagogical attention\. Keep it highly professional\. Do not use markdown styling\. Data: \$\{JSON\.stringify\(summaryData\)\}`;/g;

const newPrompt = `const prompt = \`Act as an expert Academic Data Analyst for the 'AI-Driven Student Evaluation System'. Analyze this student cohort data (for \${scopeText}) and provide a concise, 2-to-3 sentence executive summary. Explain it in simple, easy-to-understand terms suitable for teachers. Highlight any notable anomalies, strong performing sections, or areas needing pedagogical attention. Keep it friendly and concise. Do not use markdown styling. Data: \${JSON.stringify(summaryData)}\`;`;

let patched = false;
if (content.match(targetRegex)) {
    content = content.replace(targetRegex, newCode);
    patched = true;
} else {
    console.log("Could not find summaryData target block");
}

if (content.match(promptRegex)) {
    content = content.replace(promptRegex, newPrompt);
    patched = true;
} else {
    console.log("Could not find prompt string");
}

if (patched) {
    fs.writeFileSync(file, content);
    console.log("Patched dashboard.js successfully");
}
