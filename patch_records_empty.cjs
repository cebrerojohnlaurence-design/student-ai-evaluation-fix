const fs = require('fs');
let c = fs.readFileSync('public/js/admin/records.js', 'utf8');

const emptyStateBlock = `\r\n    // Teacher with NO sections assigned and NO pinned sections \u2192 show empty state\r\n    if (currentUser.role === 'teacher' && availableForSelect.length === 0) {\r\n        container.innerHTML = \`\r\n            <div class="flex flex-col items-center justify-center h-[60vh] gap-6 animate-fade-in">\r\n                <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 max-w-md w-full text-center">\r\n                    <div class="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">\r\n                        <i class="fas fa-clipboard-list text-primary text-3xl"></i>\r\n                    </div>\r\n                    <h2 class="text-xl font-bold text-gray-800 mb-2">No Sections Yet</h2>\r\n                    <p class="text-sm text-gray-500 mb-6">\r\n                        You have not been assigned to any section yet.<br>\r\n                        Click the button below to add your section and start encoding grades.\r\n                    </p>\r\n                    <button onclick="promptAddViewSection()"\r\n                        class="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primaryDark transition shadow">\r\n                        <i class="fas fa-plus mr-2"></i>Add My Section\r\n                    </button>\r\n                </div>\r\n            </div>\r\n        \`;\r\n        return;\r\n    }\r\n`;

const OLD = `\r\n    let dropdownOptions = '';\r\n    if (currentUser.role === 'admin' || currentUser.role === 'curriculum_coordinator') {`;

const NEW = emptyStateBlock + `\r\n    let dropdownOptions = '';\r\n    if (currentUser.role === 'admin' || currentUser.role === 'curriculum_coordinator') {`;

if (c.includes(OLD)) {
    c = c.replace(OLD, NEW);
    fs.writeFileSync('public/js/admin/records.js', c);
    console.log('Done!');
} else {
    console.log('NOT FOUND - checking for exact match...');
    // Try finding the section
    const idx = c.indexOf('let dropdownOptions');
    console.log('idx of let dropdownOptions:', idx);
    console.log(JSON.stringify(c.slice(idx - 5, idx + 5)));
}
