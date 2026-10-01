const fs = require('fs');
let appJs = fs.readFileSync('public/js/admin/records.js', 'utf8');

const target = `function setAdminLevelFilter(level) {
    adminLevelFilter = level;
    renderAdminTeacherList(document.getElementById('content-area'));
}`;

const targetRN = `function setAdminLevelFilter(level) {\r
    adminLevelFilter = level;\r
    renderAdminTeacherList(document.getElementById('content-area'));\r
}`;

const replacement = `function setAdminLevelFilter(level) {
    adminLevelFilter = level;
    if (adminRecordsTab === 'advisory') {
        renderAdminAdvisoryList(document.getElementById('content-area'));
    } else {
        renderAdminTeacherList(document.getElementById('content-area'));
    }
}`;

appJs = appJs.replace(target, replacement);
appJs = appJs.replace(targetRN, replacement.replace(/\n/g, '\r\n'));

fs.writeFileSync('public/js/admin/records.js', appJs);
console.log("Done!");
