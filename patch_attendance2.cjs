const fs = require('fs');

const file = 'd:/practice/practice/ai-driven/public/js/admin/records.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /if\s*\(res\.ok\)\s*\{\s*showMessage\("Daily attendance sheet saved successfully!"\);\s*await initAppData\(\);/g;
const newCode = `if (res.ok) {
            showMessage("Daily attendance sheet saved successfully!");
            if (typeof fetchedAttendanceSections !== 'undefined') fetchedAttendanceSections.delete(section);
            await initAppData();`;
            
if (content.match(regex)) {
    content = content.replace(regex, newCode);
    fs.writeFileSync(file, content);
    console.log("Patched records.js successfully");
} else {
    console.log("Could not find target in records.js with regex");
}
