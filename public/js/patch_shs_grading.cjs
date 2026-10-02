const fs = require('fs');
let appJs = fs.readFileSync('public/js/app.js', 'utf8');

// 1. Replace getTransmutedGrade with SHS-aware version
const oldTransmute = `function getTransmutedGrade(percent) {
    if (percent === null || percent === undefined || isNaN(percent)) return null;
    let p = parseFloat(percent);
    if (p > 100) p = 100;
    if (p === 100) return 100;

    // DepEd DO 8 s. 2015 Transmutation Table implementation
    if (p >= 60) {
        // 60 -> 75, each step of 1.6 adds 1 point
        let step = Math.floor((p - 60) / 1.6);
        let grade = 75 + step;
        return grade > 99 ? 99 : grade;
    } else {
        // 0 -> 60, each step of 4 adds 1 point
        let step = Math.floor(p / 4);
        let grade = 60 + step;
        return grade > 74 ? 74 : grade;
    }
}`;

const newTransmute = `// JHS Transmutation (DepEd DO 8 s. 2015)
function getTransmutedGrade(percent) {
    if (percent === null || percent === undefined || isNaN(percent)) return null;
    let p = parseFloat(percent);
    if (p > 100) p = 100;
    if (p === 100) return 100;
    if (p >= 60) {
        let step = Math.floor((p - 60) / 1.6);
        let grade = 75 + step;
        return grade > 99 ? 99 : grade;
    } else {
        let step = Math.floor(p / 4);
        let grade = 60 + step;
        return grade > 74 ? 74 : grade;
    }
}

// SHS Adjusted Transmutation Table (DepEd Order 015 s. 2026)
const SHS_TRANSMUTATION_TABLE = [
    [99.50, 100.00, 99], [98.32, 99.49, 98], [97.14, 98.31, 97], [95.96, 97.13, 96],
    [94.78, 95.95, 95], [93.60, 94.77, 94], [92.42, 93.59, 93], [91.24, 92.41, 92],
    [90.06, 91.23, 91], [88.88, 90.05, 90], [87.70, 88.87, 89], [86.52, 87.69, 88],
    [85.34, 86.51, 87], [84.16, 85.33, 86], [82.98, 84.15, 85], [81.80, 82.97, 84],
    [80.62, 81.79, 83], [79.44, 80.61, 82], [78.26, 79.43, 81], [77.08, 78.25, 80],
    [75.90, 77.07, 79], [74.72, 75.89, 78], [73.54, 74.71, 77], [72.36, 73.53, 76],
    [71.18, 72.35, 75], [70.00, 71.17, 74], [65.34, 69.99, 73], [60.67, 65.33, 72],
    [56.01, 60.66, 71], [51.34, 56.00, 70], [46.67, 51.33, 69], [42.01, 46.66, 68],
    [37.34, 42.00, 67], [32.68, 37.33, 66], [28.01, 32.67, 65], [23.35, 28.00, 64],
    [18.69, 23.34, 63], [14.01, 18.68, 62], [0.00, 14.00, 61]
];

function getSHSTransmutedGrade(initialGrade) {
    if (initialGrade === null || initialGrade === undefined || isNaN(initialGrade)) return null;
    const ig = parseFloat(initialGrade);
    for (const [min, max, tg] of SHS_TRANSMUTATION_TABLE) {
        if (ig >= min && ig <= max) return tg;
    }
    return 60;
}`;

if (!appJs.includes('getSHSTransmutedGrade')) {
    appJs = appJs.replace(oldTransmute, newTransmute);
    console.log('Transmutation updated:', appJs.includes('getSHSTransmutedGrade') ? 'YES' : 'NO');
} else {
    console.log('SHS transmutation already exists, skipping.');
}

// 2. Replace getSubjectWeights with SHS-aware version
const oldWeights = `    if (isSH) {
        // Core SHS DepEd Distribution (DO 8 s. 2015) 
        // Defaulting to 25-50-25 for all SHS Subjects for now
        return { ww: 0.25, pt: 0.50, qa: 0.25 };
    }`;

const newWeights = `    if (isSH) {
        // DepEd Order 015 s. 2026 — Strengthened SHS Component Weights
        if (s.includes('work immersion') || s.includes('immersion')) {
            return { ww: 0.20, pt: 0.80, qa: 0.00, isSHS: true, noEX: true };
        }
        if (s.includes('research') || s.includes('innovation') || s.includes('inquiries')) {
            return { ww: 0.40, pt: 0.60, qa: 0.00, isSHS: true, noEX: true };
        }
        if (s.includes('field experience') || s.includes('community engagement') || s.includes('practicum')) {
            return { ww: 0.15, pt: 0.70, qa: 0.15, isSHS: true };
        }
        if (s.includes('arts') || s.includes('sports') || s.includes('wellness') || s.includes('physical education and health')) {
            return { ww: 0.20, pt: 0.60, qa: 0.20, isSHS: true };
        }
        if (typeof currentUser !== 'undefined' && currentUser && currentUser.strand === 'TechPro') {
            return { ww: 0.15, pt: 0.65, qa: 0.20, isSHS: true };
        }
        // Core + Academic Electives (Default SHS): WW=20%, PT=50%, EX=30%
        return { ww: 0.20, pt: 0.50, qa: 0.30, isSHS: true };
    }`;

// Also fix isSH detection to use currentUser.department
const oldIsSHCheck = `    // Check if Senior High based on student object or global context
    let isSH = window.studentsAnalyticsLevel === 'SH';
    if (studentObj && studentObj.section) {
        // Quick heuristic: If section contains Grade 11 or Grade 12
        const checkSec = studentObj.section.toLowerCase();
        if (checkSec.includes('grade 11') || checkSec.includes('grade 12') || checkSec.includes('gr 11') || checkSec.includes('gr 12')) {
            isSH = true;
        }
    }`;
const newIsSHCheck = `    // Check if Senior High based on coordinator session, student section, or global flag
    let isSH = window.studentsAnalyticsLevel === 'SH'
        || (typeof currentUser !== 'undefined' && currentUser && currentUser.department === 'SHS');
    if (studentObj && studentObj.section) {
        const checkSec = studentObj.section.toLowerCase();
        if (checkSec.includes('grade 11') || checkSec.includes('grade 12') || checkSec.includes('gr 11') || checkSec.includes('gr 12')) {
            isSH = true;
        }
    }`;

appJs = appJs.replace(oldIsSHCheck, newIsSHCheck);
appJs = appJs.replace(oldWeights, newWeights);

// 3. Make recalcStudentSubject use SHS transmutation when in SHS context
const oldRecalcGrade = `        sub.g = getTransmutedGrade(initialGrade);`;
const newRecalcGrade = `        const _isSHSWeights = weights.isSHS;
        sub.g = _isSHSWeights ? getSHSTransmutedGrade(initialGrade) : getTransmutedGrade(initialGrade);`;

appJs = appJs.replace(oldRecalcGrade, newRecalcGrade);

fs.writeFileSync('public/js/app.js', appJs);
console.log('Done! Checking patches:');
console.log('- SHS transmutation:', appJs.includes('getSHSTransmutedGrade') ? 'YES' : 'NO');
console.log('- SHS department check:', appJs.includes("currentUser.department === 'SHS'") ? 'YES' : 'NO');
console.log('- SHS recalc:', appJs.includes('_isSHSWeights') ? 'YES' : 'NO');
console.log('- Work Immersion weight:', appJs.includes('work immersion') ? 'YES' : 'NO');
