const fs = require('fs');
let r = fs.readFileSync('public/js/admin/records.js', 'utf8');

// 1. Fix QA header label for SHS vs JHS
const oldQAHeader = `Assessment (\${qaWeight}%) <i class="fas fa-edit text-[10px]"></i></span>`;
const newQAHeader = `\${isSHS ? 'Examination - EX' : 'Assessment'} (\${qaWeight}%) <i class="fas fa-edit text-[10px]"></i></span>`;
r = r.replace(oldQAHeader, newQAHeader);

// 2. Fix isSHS detection in renderDetailedSubjectView to also check currentUser.department
const oldIsSHSCheck = `    let isSHS = false;\n\n    // Check if the currently pinned sections indicate SHS\n    if (visiblePinnedSections.length > 0) {\n        const secName = visiblePinnedSections[0].toLowerCase();\n        if (secName.includes('grade 11') || secName.includes('grade 12') || secName.includes('gr 11') || secName.includes('gr 12') || window.studentsAnalyticsLevel === 'SH') {\n            isSHS = true;\n        }\n    }`;
const newIsSHSCheck = `    // Check SHS mode: coordinator department, section name, or global flag
    let isSHS = (currentUser && currentUser.department === 'SHS')
        || window.studentsAnalyticsLevel === 'SH';
    if (!isSHS && visiblePinnedSections.length > 0) {
        const secName = visiblePinnedSections[0].toLowerCase();
        if (secName.includes('grade 11') || secName.includes('grade 12') || secName.includes('gr 11') || secName.includes('gr 12')) {
            isSHS = true;
        }
    }`;
r = r.replace(oldIsSHSCheck, newIsSHSCheck);

// 3. Also fix isSHS in renderSubjectGradesTable (line ~2106)
const oldIsSHSTable = `    let isSHS = false;\n\n    if (visiblePinnedSections.length > 0) {`;
const newIsSHSTable = `    // Check SHS mode from coordinator department, section name, or global flag
    let isSHS = (currentUser && currentUser.department === 'SHS') || window.studentsAnalyticsLevel === 'SH';

    if (!isSHS && visiblePinnedSections.length > 0) {`;
r = r.replace(oldIsSHSTable, newIsSHSTable);

fs.writeFileSync('public/js/admin/records.js', r);
console.log('Records.js patched!');
console.log('- QA→EX label:', r.includes('Examination - EX') ? 'YES' : 'NO');
console.log('- isSHS dept check:', r.includes("currentUser.department === 'SHS'") ? 'YES' : 'NO');
