const fs = require('fs');
const file = 'd:/practice/practice/ai-driven/public/js/admin/addstudents.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /if \(!res\.ok\) \{\s*showMessage\(data\.error \|\| 'Failed to save student\.', true\);\s*return;\s*\}/;

const newBlock = `if (!res.ok) {
            let errMsg = data.error || data.message || 'Failed to save student. Server returned: ' + res.status;
            if (data.exception) {
                errMsg += ' - ' + data.exception;
            }
            showMessage(errMsg, true);
            return;
        }`;

if (content.match(regex)) {
    content = content.replace(regex, newBlock);
    fs.writeFileSync(file, content);
    console.log('Fixed error handling in addstudents.js');
} else {
    console.log('Regex not found!');
}
