const fs = require('fs');
let appJs = fs.readFileSync('public/js/admin/records.js', 'utf8');

const target = `function switchRecordsTab(tab) {
    adminRecordsTab = tab;
    adminSelectedTeacher = null;
    adminSelectedSection = null;
    if (tab === 'students') {
        renderAdminStudentsAnalytics(document.getElementById('content-area'));
    } else {
        renderAdminTeacherList(document.getElementById('content-area'));
    }
}`;

const replacement = `function switchRecordsTab(tab) {
    adminRecordsTab = tab;
    adminSelectedTeacher = null;
    adminSelectedSection = null;
    if (tab === 'students') {
        renderAdminStudentsAnalytics(document.getElementById('content-area'));
    } else if (tab === 'advisory') {
        renderAdminAdvisoryList(document.getElementById('content-area'));
    } else {
        renderAdminTeacherList(document.getElementById('content-area'));
    }
}`;

appJs = appJs.replace(target, replacement);

// Try again with \r\n if target wasn't found
if (appJs.indexOf("tab === 'advisory'") === -1) {
    const targetRN = target.replace(/\n/g, '\r\n');
    const replacementRN = replacement.replace(/\n/g, '\r\n');
    appJs = appJs.replace(targetRN, replacementRN);
}

fs.writeFileSync('public/js/admin/records.js', appJs);
console.log("Done");
