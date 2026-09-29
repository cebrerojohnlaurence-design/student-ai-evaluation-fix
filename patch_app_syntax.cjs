const fs = require('fs');
const file = 'd:/practice/practice/ai-driven/public/js/app.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /            \}\n    \} catch \(e\) \{\n        console\.error\('Failed to fetch settings', e\);\n    \}\n\}/;
const newCode = `            }
        }
    } catch (e) {
        console.error('Failed to fetch settings', e);
    }
}`;

content = content.replace(regex, newCode);
fs.writeFileSync(file, content);
console.log("Fixed syntax error in app.js");
