const fs = require('fs');
let appJs = fs.readFileSync('public/js/app.js', 'utf8');

const target1 = `        if (startIdx !== -1 && endIdx !== -1) {
            cleanRes = cleanRes.substring(startIdx, endIdx + 1);
        }`;
const target1RN = target1.replace(/\n/g, '\r\n');

const rep1 = `        if (startIdx !== -1 && endIdx !== -1) {
            cleanRes = cleanRes.substring(startIdx, endIdx + 1);
        } else {
            throw new Error("No JSON array found in AI response. (Try again or check format)");
        }`;

appJs = appJs.replace(target1, rep1);
appJs = appJs.replace(target1RN, rep1.replace(/\n/g, '\r\n'));

const target2 = `showMessage("AI failed to read document or API connection failed. Check console.", true);`;
const rep2 = `showMessage("AI Error: " + e.message, true);`;

appJs = appJs.replace(target2, rep2);

fs.writeFileSync('public/js/app.js', appJs);
console.log("Updated app.js error handling!");
