const fs = require('fs');

const file = 'd:/practice/practice/ai-driven/public/js/admin/dashboard.js';
let content = fs.readFileSync(file, 'utf8');

// Change the modal filter logic so that it DOES NOT filter by >= 90
const filterRegex = /if \(modalActiveMetric === 'attendance'\) return s\.attendance >= 90;/g;
const newFilter = `if (modalActiveMetric === 'attendance') return true; // Show all students to explain the true average`;

// Change the title from 'Average Attendance (>=90%)' to 'Average Attendance'
const titleRegex = /'attendance': 'Average Attendance \(\>=90\%\)'/g;
const newTitle = `'attendance': 'Average Attendance'`;

let patched = false;

if (content.match(filterRegex)) {
    content = content.replace(filterRegex, newFilter);
    patched = true;
} else {
    console.log("Could not find modal filter logic.");
}

if (content.match(titleRegex)) {
    content = content.replace(titleRegex, newTitle);
    patched = true;
} else {
    console.log("Could not find modal title.");
}

if (patched) {
    fs.writeFileSync(file, content);
    console.log("Patched admin dashboard modal successfully.");
}
