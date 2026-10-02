const fs = require('fs');
let content = fs.readFileSync('public/js/admin/records.js', 'utf-8');

// Use Regex to replace the select block
const regex = /<select onchange="setPinnedSection\(this\.value\)" class="text-xs font-bold text-gray-700 bg-transparent outline-none cursor-pointer pl-3 pr-8 py-2 appearance-none w-48">\s*\$\{dropdownOptions\}\s*<\/select>\s*<i class="fas fa-chevron-down absolute right-3 text-\[10px\] text-gray-400 pointer-events-none group-hover:text-primary transition"><\/i>\s*<\/div>/g;

const replaceHtml = `<select onchange="setPinnedSection(this.value)" class="text-xs font-bold text-gray-700 bg-transparent outline-none cursor-pointer pl-3 pr-[3.5rem] py-2 appearance-none w-48 truncate">
                \${dropdownOptions}
            </select>
            <i class="fas fa-chevron-down absolute right-10 text-[10px] text-gray-400 pointer-events-none group-hover:text-primary transition"></i>
            \${currentRecordSection && currentRecordSection !== 'all' ? \`
            <button onclick="removePinnedSection('\${currentRecordSection}')" title="Remove this section" class="bg-red-50 px-3 py-2 absolute right-0 top-0 bottom-0 flex items-center justify-center border-l border-gray-100 hover:bg-red-500 transition cursor-pointer group/btn-rm z-10">
                <i class="fas fa-trash-alt text-red-500 group-hover/btn-rm:text-white transition text-xs"></i>
            </button>
            \` : ''}
        </div>`;

content = content.replace(regex, replaceHtml);

fs.writeFileSync('public/js/admin/records.js', content, 'utf-8');
console.log("Regex modification complete.");
