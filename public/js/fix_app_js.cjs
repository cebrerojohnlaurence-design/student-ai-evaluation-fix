const fs = require('fs');
let appJs = fs.readFileSync('public/js/app.js', 'utf8');

const fetchSettingsTarget = `
            // Apply global settings to UI immediately upon fetching`;
const fetchSettingsReplacement = `
            if (globalSettings.system_max_scores) {
                try {
                    maxScores = JSON.parse(globalSettings.system_max_scores);
                    localStorage.setItem('system_max_scores', globalSettings.system_max_scores);
                } catch(e) {}
            }
            // Apply global settings to UI immediately upon fetching`;

appJs = appJs.replace(fetchSettingsTarget, fetchSettingsReplacement);

const saveMaxTarget = `function saveMaxScores() {
    localStorage.setItem('system_max_scores', JSON.stringify(maxScores));
}`;
const saveMaxTargetRN = `function saveMaxScores() {\r
    localStorage.setItem('system_max_scores', JSON.stringify(maxScores));\r
}`;
const saveMaxReplacement = `function saveMaxScores() {
    const jsonStr = JSON.stringify(maxScores);
    localStorage.setItem('system_max_scores', jsonStr);
    fetch('/api/maintenance/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ system_max_scores: jsonStr })
    }).catch(e => console.error(e));
}`;

appJs = appJs.replace(saveMaxTarget, saveMaxReplacement);
appJs = appJs.replace(saveMaxTargetRN, saveMaxReplacement.replace(/\n/g, '\r\n'));

fs.writeFileSync('public/js/app.js', appJs);
console.log("Done patching app.js!");
