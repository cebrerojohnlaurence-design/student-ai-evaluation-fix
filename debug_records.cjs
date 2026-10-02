const fs = require('fs');
let c = fs.readFileSync('public/js/admin/records.js', 'utf8');

// Find exact text after availableForSelect block
const idx = c.indexOf('    let availableForSelect = Array.from');
const snippet = c.slice(idx, idx + 900);
console.log(JSON.stringify(snippet));
