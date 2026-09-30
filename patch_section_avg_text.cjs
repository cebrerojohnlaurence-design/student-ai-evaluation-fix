const fs = require('fs');

const file = 'd:/practice/practice/ai-driven/public/js/admin/dashboard.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /msg \+= \`with an outstanding average GWA of <strong>\$\{highest\.avg\}<\/strong>\. Meanwhile, <strong>\$\{lowest\.name\}<\/strong> requires more academic support, currently averaging <strong>\$\{lowest\.avg\}<\/strong>\. Interventions are recommended\.\`;/g;

const newText = `msg += \`with a high average GWA of <strong>\${highest.avg}</strong>. Meanwhile, <strong>\${lowest.name}</strong> has a lower average of <strong>\${lowest.avg}</strong> and might need some extra help.\`;`;

if (content.match(regex)) {
    content = content.replace(regex, newText);
    fs.writeFileSync(file, content);
    console.log("Patched section average text successfully");
} else {
    console.log("Could not find section average text");
}
