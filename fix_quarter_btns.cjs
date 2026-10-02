const fs = require('fs');
let c = fs.readFileSync('public/js/admin/records.js', 'utf8');

c = c.replace(/const quarterBtnsHtml = isSHS[\s\S]*?\}\s*">\s*Q\$\{q\}\s*<\/button>\s*`\)\.join\(''\);/, `const quarterBtnsHtml = [1, 2, 3].map(q => \`
            <button onclick="setRecordQuarter(\${q})"
                class="px-3 py-1 rounded-full text-[10px] font-bold uppercase transition
                               \${(window.currentRecordQuarter || 1) === q
                ? 'bg-white text-primary shadow-sm'
                : 'text-white/80 hover:bg-white/20 hover:text-white'
            }">
                Term \${q}
            </button>\`).join('');`);

fs.writeFileSync('public/js/admin/records.js', c);
console.log('done');
