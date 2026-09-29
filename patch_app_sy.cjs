const fs = require('fs');
const file = 'd:/practice/practice/ai-driven/public/js/app.js';
let content = fs.readFileSync(file, 'utf8');

const fetchSettingsRegex = /const globalSelect = document\.getElementById\('global-school-year'\);\s*if \(globalSelect[^}]*\}\s*\} catch\(e\)\{\}\s*\}/;

const newFetchSettings = `const globalSelect = document.getElementById('global-school-year');
            if (globalSelect) {
                try {
                    let syList = [];
                    if (globalSettings.school_years) {
                        syList = JSON.parse(globalSettings.school_years);
                    }
                    if (!Array.isArray(syList) || syList.length === 0) {
                        syList = ['2025-2026'];
                    }
                    
                    let active = globalSettings.active_sy || window.currentRecordSchoolYear || '2025-2026';
                    if (!syList.includes(active)) active = syList[0];
                    
                    globalSelect.innerHTML = syList.map(sy => \`<option value="\${sy}" \${sy === active ? 'selected' : ''}>S.Y. \${sy}</option>\`).join('');
                    
                    if (window.currentRecordSchoolYear !== active) {
                        window.currentRecordSchoolYear = active;
                    }
                } catch(e) {
                    globalSelect.innerHTML = '<option value="2025-2026">S.Y. 2025-2026</option>';
                    window.currentRecordSchoolYear = '2025-2026';
                }
            }`;

content = content.replace(fetchSettingsRegex, newFetchSettings);
fs.writeFileSync(file, content);
console.log('Fixed school year dropdown loading issue.');
