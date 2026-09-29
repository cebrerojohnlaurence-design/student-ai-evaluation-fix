const fs = require('fs');
const file = 'd:/practice/practice/ai-driven/public/js/app.js';
let content = fs.readFileSync(file, 'utf8');

// Replace the block from `const globalSelect = document.getElementById('global-school-year');` down to the `}` before `} catch (e)`
const startIndex = content.indexOf("const globalSelect = document.getElementById('global-school-year');");
if (startIndex !== -1) {
    const catchIndex = content.indexOf("} catch (e) {", startIndex);
    if (catchIndex !== -1) {
        const pre = content.substring(0, startIndex);
        // The block we replace is everything up to the `        }` right before `    } catch (e) {`
        // We can just replace up to the brace right before catchIndex.
        const post = content.substring(catchIndex - 10);
        
        const newCode = `const globalSelect = document.getElementById('global-school-year');
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
            
        content = pre + newCode + "\n    " + content.substring(catchIndex);
        fs.writeFileSync(file, content);
        console.log("Successfully replaced school year logic.");
    }
}
