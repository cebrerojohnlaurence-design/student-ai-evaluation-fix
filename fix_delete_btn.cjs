const fs = require('fs');
let content = fs.readFileSync('public/js/admin/records.js', 'utf-8');

content = content.replace(
    /let jhsSections = availableSections\.filter\(sec => !sec\.startsWith\('11'\) && !sec\.startsWith\('12'\)\);/g,
    "let jhsSections = availableSections.filter(sec => { let match = sec.match(/\\b([7-9]|1[0-2])\\b/); return match && parseInt(match[1]) <= 10; });"
);

content = content.replace(
    /let shsSections = availableSections\.filter\(sec => sec\.startsWith\('11'\) \|\| sec\.startsWith\('12'\)\);/g,
    "let shsSections = availableSections.filter(sec => { let match = sec.match(/\\b([7-9]|1[0-2])\\b/); if (match && parseInt(match[1]) >= 11) { const myTeacherRec = teachers.find(t => t.id === currentUser.id); const myStrand = myTeacherRec ? (myTeacherRec.strand || currentUser.strand) : null; if (myStrand) { try { let saved = JSON.parse(localStorage.getItem('cnhs_sections') || '[]'); let sd = saved.find(x => x.name === sec); if (sd && sd.strand && sd.strand !== myStrand) return false; } catch(e) {} } return true; } return false; });"
);

content = content.replace(
    "const myLevel = myTeacherRec ? (myTeacherRec.level || 'JH') : 'JH';",
    "const myLevel = myTeacherRec ? (myTeacherRec.level || currentUser.level || 'JH') : (currentUser.level || 'JH');"
);

const targetHtml = `<select onchange="setPinnedSection(this.value)" class="text-xs font-bold text-gray-700 bg-transparent outline-none cursor-pointer pl-3 pr-8 py-2 appearance-none w-48">
                \${dropdownOptions}
            </select>
            <i class="fas fa-chevron-down absolute right-3 text-[10px] text-gray-400 pointer-events-none group-hover:text-primary transition"></i>
        </div>`;

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

content = content.replace(targetHtml, replaceHtml);

fs.writeFileSync('public/js/admin/records.js', content, 'utf-8');
console.log("Modifications complete.");
