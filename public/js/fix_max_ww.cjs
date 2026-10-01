const fs = require('fs');
let appJs = fs.readFileSync('public/js/app.js', 'utf8');

appJs = appJs.replace(
    /let MAX_WW = parseInt\(localStorage\.getItem\('system_max_ww'\)\) \|\| 5;/g,
    "let MAX_WW = parseInt(localStorage.getItem('system_max_ww')) || 10;"
);
appJs = appJs.replace(
    /let MAX_PT = parseInt\(localStorage\.getItem\('system_max_pt'\)\) \|\| 5;/g,
    "let MAX_PT = parseInt(localStorage.getItem('system_max_pt')) || 10;"
);

// We should also make sure the Gemini prompt strictly requests a JSON array and nothing else
const oldPrompt = "const excelPrompt = prompt + `\\n\\nHere is the data extracted from the sheet '${targetSheetName}' of the uploaded Excel file.${extraContext}\\n\\n` + dataString;";
const newPrompt = "const excelPrompt = prompt + `\\n\\nIMPORTANT: Return ONLY a valid JSON array. DO NOT return markdown blocks, DO NOT say 'Here is the data'. JUST the raw JSON array. \\n\\nHere is the data extracted from the sheet '${targetSheetName}' of the uploaded Excel file.${extraContext}\\n\\n` + dataString;";

appJs = appJs.replace(oldPrompt, newPrompt);

fs.writeFileSync('public/js/app.js', appJs);
console.log("Updated app.js!");
