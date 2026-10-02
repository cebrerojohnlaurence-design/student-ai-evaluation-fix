const fs = require('fs');
let s = fs.readFileSync('public/js/admin/subjects.js', 'utf8');

// 1. Change loop from sem 1-2 to term 1-3 for SHS
s = s.replace(
    `for (var sem = 1; sem <= 2; sem++) {\n        semTabs +=\n            '<button onclick=\"setSubjectSem(' + sem + ')\" class=\"px-4 py-2 rounded-lg text-xs font-bold transition ' +\n            (subPageSem === sem ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary') +\n            '\">' + (sem === 1 ? '1st Semester (Q1+Q2)' : '2nd Semester (Q3+Q4)') + '</button>';\n    }`,
    `for (var sem = 1; sem <= 3; sem++) {\n        var termLabels = { 1: 'Term 1 (June–Sept)', 2: 'Term 2 (Sept–Dec)', 3: 'Term 3 (Jan–April)' };\n        semTabs +=\n            '<button onclick=\"setSubjectSem(' + sem + ')\" class=\"px-4 py-2 rounded-lg text-xs font-bold transition ' +\n            (subPageSem === sem ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary') +\n            '\">' + (termLabels[sem] || 'Term ' + sem) + '</button>';\n    }`
);

// 2. Change subjectKey to use 'term' prefix instead of 'sem'
s = s.replace(
    `var subjectKey = 'SH_' + subPageStrand + '_' + subPageGrade + '_sem' + subPageSem;\n    var semKey = subPageSem === 1 ? 'sem1' : 'sem2';`,
    `var subjectKey = 'SH_' + subPageStrand + '_' + subPageGrade + '_term' + subPageSem;\n    var semKey = 'term' + subPageSem;`
);

// 3. Change breadcrumb label from "1st Semester / 2nd Semester" to "Term N"
s = s.replace(
    `(subPageSem === 1 ? '1st Semester' : '2nd Semester')`,
    `'Term ' + subPageSem`
);

// 4. Change scan-sem dropdown to 3 terms
s = s.replace(
    `<select id="scan-sem" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-primary bg-white"><option value="1">1st Semester</option><option value="2">2nd Semester</option></select>`,
    `<select id="scan-sem" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-primary bg-white"><option value="1">Term 1 (June–Sept)</option><option value="2">Term 2 (Sept–Dec)</option><option value="3">Term 3 (Jan–April)</option></select>`
);

fs.writeFileSync('public/js/admin/subjects.js', s);
console.log('subjects.js patched!');
console.log('- Term label:', s.includes('Term 1 (June–Sept)') ? 'YES' : 'NO');
console.log('- term key:', s.includes("'term' + subPageSem") ? 'YES' : 'NO');
