const fs = require('fs');

const file = 'd:/practice/practice/ai-driven/public/js/admin/dashboard.js';
let content = fs.readFileSync(file, 'utf8');

const promptRegex = /const prompt = `Act as an expert Academic Data Analyst.*?Data: \$\{JSON\.stringify\(summaryData\)\}`;/s;

const newPrompt = `const prompt = \`Act as a friendly assistant helping a teacher understand their students' grades for \${scopeText}. Write a very simple, 2-to-3 sentence summary. Use basic, everyday English. Do NOT use deep or academic words like "cohort", "pedagogical", "interventions", "anomalies", or "executive summary". Just talk normally like a friendly colleague. Point out if the class is doing well and if there are students who need more help. Do not use markdown styling. Data: \${JSON.stringify(summaryData)}\`;`;

if (content.match(promptRegex)) {
    content = content.replace(promptRegex, newPrompt);
    fs.writeFileSync(file, content);
    console.log("Patched dashboard.js prompt successfully");
} else {
    console.log("Could not find prompt string");
}
