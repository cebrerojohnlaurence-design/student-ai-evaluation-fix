const fs = require('fs');
const file = 'd:/practice/practice/ai-driven/public/js/admin/records.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Rewrite selectStudentMgmtProfile to use SweetAlert modal
const profileRegex = /window\.selectStudentMgmtProfile = function\(lrn\) \{[\s\S]*?\};/;
const newProfile = `window.selectStudentMgmtProfile = function(lrn) {
    const sel = students.find(s => s.lrn === lrn);
    if (!sel) return;
    
    // Determine Level
    let gLevel = 'Unknown Level';
    const sName = (sel.section || '').toLowerCase();
    if (sName.match(/\\b12\\b/) || sName.startsWith('12')) gLevel = 'Grade 12';
    else if (sName.match(/\\b11\\b/) || sName.startsWith('11')) gLevel = 'Grade 11';
    else if (sName.match(/\\b10\\b/) || sName.startsWith('10')) gLevel = 'Grade 10';
    else if (sName.match(/\\b9\\b/) || sName.startsWith('9-')) gLevel = 'Grade 9';
    else if (sName.match(/\\b8\\b/) || sName.startsWith('8-')) gLevel = 'Grade 8';
    else if (sName.match(/\\b7\\b/) || sName.startsWith('7-')) gLevel = 'Grade 7';
    else {
        try {
            const savedSections = JSON.parse(localStorage.getItem('cnhs_sections') || '[]');
            const secData = savedSections.find(x => x.name.toLowerCase() === sName);
            if (secData && secData.year) {
                let m2 = secData.year.match(/\\b([7-9]|1[0-2])\\b/);
                if (m2) gLevel = 'Grade ' + m2[1];
            }
        } catch(e) {}
    }
    
    let advName = 'None';
    if (typeof teachers !== 'undefined') {
        const adv = teachers.find(t => t.is_adviser && (t.section || '').toLowerCase().includes(sName));
        if(adv) advName = adv.name;
    }
    
    const photo = sel.photo || 'https://ui-avatars.com/api/?name='+encodeURIComponent(sel.name)+'&size=120&background=166534&color=fff';
    
    Swal.fire({
        html: \`
            <div class="text-left relative overflow-hidden bg-white p-2">
                <div class="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
                    <i class="fas fa-user-graduate text-[150px]"></i>
                </div>
                <div class="flex flex-col md:flex-row gap-6 relative z-10 items-center md:items-start">
                    <img src="\${photo}" class="w-24 h-24 rounded-2xl object-cover border-4 border-green-50 shadow-sm shrink-0">
                    <div class="flex-1 w-full">
                        <div class="flex justify-between items-start">
                            <div>
                                <h3 class="text-2xl font-black text-gray-800">\${sel.name}</h3>
                                <p class="text-sm text-gray-500 font-bold mt-1">\${sel.lrn} • \${sel.email || 'No email provided'}</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4 mt-6">
                            <div>
                                <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Level</p>
                                <p class="text-sm font-bold text-gray-800">\${gLevel}</p>
                            </div>
                            <div>
                                <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Location</p>
                                <p class="text-sm font-bold text-gray-800"><i class="fas fa-map-marker-alt text-gray-300 mr-1"></i> \${sel.section || 'Unassigned'}</p>
                            </div>
                            <div>
                                <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Adviser</p>
                                <p class="text-sm font-bold text-gray-800 truncate">\${advName}</p>
                            </div>
                            <div>
                                <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">General Average</p>
                                <p class="text-sm font-bold \${sel.gwa >= 90 ? 'text-yellow-600' : sel.gwa >= 75 ? 'text-green-600' : 'text-red-500'}">\${sel.gwa > 0 ? sel.gwa.toFixed(2) : 'No Grades'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        \`,
        showConfirmButton: false,
        showCloseButton: true,
        customClass: {
            popup: 'rounded-3xl p-4'
        },
        width: '600px'
    });
};`;
content = content.replace(profileRegex, newProfile);

// 2. Fix guessGradeFromSection to include localStorage logic so it doesn't say "Unknown Level"
const guessRegex = /function guessGradeFromSection\(sec\) \{[\s\S]*?return 'Unknown Level';\n    \}/;
const newGuess = `function guessGradeFromSection(sec) {
        const s = (sec || '').toLowerCase();
        if (s.match(/\\b12\\b/) || s.startsWith('12')) return 'Grade 12';
        if (s.match(/\\b11\\b/) || s.startsWith('11')) return 'Grade 11';
        if (s.match(/\\b10\\b/) || s.startsWith('10')) return 'Grade 10';
        if (s.match(/\\b9\\b/) || s.startsWith('9-')) return 'Grade 9';
        if (s.match(/\\b8\\b/) || s.startsWith('8-')) return 'Grade 8';
        if (s.match(/\\b7\\b/) || s.startsWith('7-')) return 'Grade 7';
        
        try {
            const savedSections = JSON.parse(localStorage.getItem('cnhs_sections') || '[]');
            const secData = savedSections.find(x => x.name.toLowerCase() === s);
            if (secData && secData.year) {
                let m2 = secData.year.match(/\\b([7-9]|1[0-2])\\b/);
                if (m2) return 'Grade ' + m2[1];
            }
        } catch(e) {}
        
        if (typeof teachers !== 'undefined') {
            const adv = teachers.find(t => t.is_adviser && (t.section || '').split(',').map(x => x.trim().toLowerCase()).includes(s));
            if (adv) {
                if (adv.level === 'SH') return 'Grade 11';
                if (adv.level === 'JH') return 'Grade 7';
            }
        }
        return 'Unknown Level';
    }`;
content = content.replace(guessRegex, newGuess);

// 3. Remove inline profile render and fix row classes
content = content.replace(/let selectedStudentHtml = '';[\s\S]*?\/\/ 4\. Render Table Rows/, '// 4. Render Table Rows');
content = content.replace(/\$\{selectedStudentHtml\}/g, '');
content = content.replace(/const rowClass = isSelected \? 'bg-green-50\/50' : 'hover:bg-gray-50 cursor-pointer';/, "const rowClass = 'hover:bg-gray-50 cursor-pointer';");

fs.writeFileSync(file, content);
console.log('Patched modal successfully!');
