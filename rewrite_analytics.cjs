const fs = require('fs');
const file = 'd:/practice/practice/ai-driven/public/js/admin/records.js';
let content = fs.readFileSync(file, 'utf8');

// We match from the start of the function up to the end of the chart render logic
const regex = /function renderAdminStudentsAnalytics\(container\) \{[\s\S]*?\/\/ ── Render charts with Chart\.js ──[\s\S]*?\}\);?\s*\}/;

const replacement = `window.studentsAnalyticsGrade = window.studentsAnalyticsGrade || 'all';
window.studentsAnalyticsSection = window.studentsAnalyticsSection || 'all';
window.studentsAnalyticsSelectedLRN = window.studentsAnalyticsSelectedLRN || null;
window.studentsAnalyticsSearch = window.studentsAnalyticsSearch || '';

window.toggleStudentMgmtFilters = function() {
    const pop = document.getElementById('student-mgmt-filters-popover');
    if(pop) pop.classList.toggle('hidden');
};

window.filterStudentMgmtList = function(val) {
    window.studentsAnalyticsSearch = val.toLowerCase();
    const rows = document.querySelectorAll('.student-mgmt-row');
    rows.forEach(row => {
        const name = row.getAttribute('data-name');
        if(name.includes(window.studentsAnalyticsSearch)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
};

window.selectStudentMgmtProfile = function(lrn) {
    window.studentsAnalyticsSelectedLRN = lrn;
    renderAdminStudentsAnalytics(document.getElementById('content-area'));
};

function renderAdminStudentsAnalytics(container) {
    // 1. Determine all unique grades and sections
    function guessGradeFromSection(sec) {
        const s = (sec || '').toLowerCase();
        if (s.match(/\\b12\\b/) || s.startsWith('12')) return 'Grade 12';
        if (s.match(/\\b11\\b/) || s.startsWith('11')) return 'Grade 11';
        if (s.match(/\\b10\\b/) || s.startsWith('10')) return 'Grade 10';
        if (s.match(/\\b9\\b/) || s.startsWith('9-')) return 'Grade 9';
        if (s.match(/\\b8\\b/) || s.startsWith('8-')) return 'Grade 8';
        if (s.match(/\\b7\\b/) || s.startsWith('7-')) return 'Grade 7';
        
        if (typeof teachers !== 'undefined') {
            const adv = teachers.find(t => t.is_adviser && (t.section || '').split(',').map(x => x.trim().toLowerCase()).includes(s));
            if (adv) {
                if (adv.level === 'SH') return 'Grade 11';
                if (adv.level === 'JH') return 'Grade 7';
            }
        }
        return 'Unknown Level';
    }

    let allGrades = new Set();
    let allSections = new Set();
    
    students.forEach(s => {
        if(s.section) {
            allSections.add(s.section);
            allGrades.add(guessGradeFromSection(s.section));
        }
    });
    allGrades = Array.from(allGrades).sort();
    allSections = Array.from(allSections).sort();

    // 2. Filter students
    let filtered = students.filter(s => s.section);
    if (window.studentsAnalyticsGrade !== 'all') {
        filtered = filtered.filter(s => guessGradeFromSection(s.section) === window.studentsAnalyticsGrade);
    }
    if (window.studentsAnalyticsSection !== 'all') {
        filtered = filtered.filter(s => s.section === window.studentsAnalyticsSection);
    }

    // 3. Render Profile Summary
    let selectedStudentHtml = '';
    if (window.studentsAnalyticsSelectedLRN) {
        const sel = students.find(s => s.lrn === window.studentsAnalyticsSelectedLRN);
        if (sel) {
            const gLevel = guessGradeFromSection(sel.section);
            let advName = 'None';
            if (typeof teachers !== 'undefined') {
                const adv = teachers.find(t => t.is_adviser && (t.section || '').toLowerCase().includes((sel.section||'').toLowerCase()));
                if(adv) advName = adv.name;
            }
            
            selectedStudentHtml = \`
            <div class="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm mb-6 flex flex-col md:flex-row gap-6 relative overflow-hidden animate-slide-up">
                <div class="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
                    <i class="fas fa-user-graduate text-[150px]"></i>
                </div>
                <div class="relative shrink-0">
                    <img src="\${sel.photo || 'https://ui-avatars.com/api/?name='+encodeURIComponent(sel.name)+'&size=120&background=166534&color=fff'}" class="w-24 h-24 rounded-2xl object-cover border-4 border-green-50 shadow-sm">
                </div>
                <div class="flex-1 relative z-10 flex flex-col justify-center">
                    <div class="flex flex-col md:flex-row justify-between items-start">
                        <div>
                            <h3 class="text-2xl font-black text-gray-800">\${sel.name} 
                                \${sel.gwa >= 90 ? '<span class="ml-2 px-2 py-0.5 bg-yellow-100 border border-yellow-200 text-yellow-700 rounded-md text-[10px] uppercase font-bold tracking-wider inline-flex items-center"><i class="fas fa-medal mr-1"></i> Scholar</span>' : ''}
                            </h3>
                            <p class="text-sm text-gray-500 font-bold mt-1">\${sel.lrn} • \${sel.email || 'No email provided'}</p>
                        </div>
                        <button class="mt-4 md:mt-0 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition">
                            <i class="fas fa-edit mr-1"></i> Edit Profile
                        </button>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <div>
                            <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Level</p>
                            <p class="text-sm font-bold text-gray-800">\${gLevel}</p>
                        </div>
                        <div>
                            <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Assigned Adviser</p>
                            <p class="text-sm font-bold text-gray-800 truncate" title="\${advName}">\${advName}</p>
                        </div>
                        <div>
                            <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Location</p>
                            <p class="text-sm font-bold text-gray-800"><i class="fas fa-map-marker-alt text-gray-300 mr-1"></i> \${sel.section}</p>
                        </div>
                        <div>
                            <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">General Average</p>
                            <p class="text-sm font-bold text-primary">\${sel.gwa > 0 ? sel.gwa.toFixed(2) : 'No Grades'}</p>
                        </div>
                    </div>
                </div>
            </div>\`;
        }
    }

    // 4. Render Table Rows
    const studentRowsHtml = filtered.sort((a,b) => a.name.localeCompare(b.name)).map(s => {
        const hasFailing = s.grades && Object.values(s.grades).some(g => parseFloat(g) < 75);
        let statusText = 'Pending';
        let statusColor = 'bg-gray-100 text-gray-500';
        let barColor = 'bg-gray-300';
        let progress = 0;
        
        if (s.gwa > 0) {
            progress = s.gwa;
            if (s.gwa >= 90 && !hasFailing) {
                statusText = 'Excellent';
                statusColor = 'bg-emerald-100 text-emerald-700';
                barColor = 'bg-emerald-500';
            } else if (s.gwa >= 75) {
                statusText = 'Passing';
                statusColor = 'bg-blue-100 text-blue-700';
                barColor = 'bg-blue-500';
            } else {
                statusText = 'At Risk';
                statusColor = 'bg-red-100 text-red-700';
                barColor = 'bg-red-500';
            }
        }
        
        const isSelected = window.studentsAnalyticsSelectedLRN === s.lrn;
        const rowClass = isSelected ? 'bg-green-50/50' : 'hover:bg-gray-50 cursor-pointer';

        return \`
        <tr class="\${rowClass} transition-colors student-mgmt-row" data-name="\${s.name.toLowerCase()}" onclick="selectStudentMgmtProfile('\${s.lrn}')">
            <td class="py-3 px-2 text-center" onclick="event.stopPropagation()">
                <input type="checkbox" class="rounded border-gray-300 accent-primary w-4 h-4 mt-1 cursor-pointer">
            </td>
            <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                    <img src="\${s.photo || 'https://ui-avatars.com/api/?name='+encodeURIComponent(s.name)+'&background=f3f4f6&color=6b7280'}" class="w-8 h-8 rounded-full object-cover">
                    <div>
                        <p class="font-bold text-gray-800 leading-tight">\${s.name}</p>
                        <p class="text-[10px] text-gray-400">\${s.lrn}</p>
                    </div>
                </div>
            </td>
            <td class="py-3 px-4 text-gray-600 font-medium">\${s.section}</td>
            <td class="py-3 px-4 text-gray-600 font-medium">\${guessGradeFromSection(s.section)}</td>
            <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                    <span class="w-16 px-2 py-0.5 rounded text-[10px] font-bold text-center \${statusColor} uppercase tracking-wider">\${statusText}</span>
                    <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[80px]">
                        <div class="h-full \${barColor} rounded-full" style="width: \${progress}%"></div>
                    </div>
                    <span class="text-xs font-bold text-gray-600 w-8">\${s.gwa > 0 ? s.gwa.toFixed(1) : '-'}</span>
                </div>
            </td>
            <td class="py-3 px-4 text-center">
                <button class="text-gray-400 hover:text-primary transition p-1"><i class="fas fa-ellipsis-v"></i></button>
            </td>
        </tr>\`;
    }).join('');

    const tabBtns = \`
        <div class="flex gap-1 bg-gray-100 rounded-2xl p-1 shrink-0">
            <button onclick="switchRecordsTab('teachers')" class="px-5 py-2 rounded-xl text-sm font-bold transition text-gray-500 hover:text-primary">
                <i class="fas fa-chalkboard-teacher mr-1.5"></i>Teachers
            </button>
            <button onclick="switchRecordsTab('students')" class="px-5 py-2 rounded-xl text-sm font-bold transition bg-white text-primary shadow-sm">
                <i class="fas fa-users mr-1.5"></i>Students
            </button>
        </div> \`;

    container.innerHTML = \`
    <div class="flex flex-col gap-6 animate-slide-up h-full pb-10">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 class="text-2xl font-black text-gray-800 tracking-tight">Student Management</h2>
                <p class="text-sm text-gray-400 font-medium mt-1">Manage your student information and view academic records.</p>
            </div>
            <div class="flex flex-col items-end gap-3">
                \${tabBtns}
            </div>
        </div>

        \${selectedStudentHtml}

        <!-- Student List Section -->
        <div class="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex-1 flex flex-col min-h-[500px]">
            <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 relative z-20">
                <div class="flex items-center gap-3">
                    <h3 class="text-lg font-black text-gray-800">Students</h3>
                    <span class="text-primary font-bold bg-green-50 px-2 py-0.5 rounded text-sm">\${filtered.length}</span>
                </div>
                <div class="flex items-center gap-3 w-full lg:w-auto relative">
                    <div class="relative flex-1 lg:w-64">
                        <i class="fas fa-search absolute left-3 top-2.5 text-gray-400"></i>
                        <input type="text" id="student-mgmt-search" placeholder="Search Students..." value="\${window.studentsAnalyticsSearch}" onkeyup="filterStudentMgmtList(this.value)" class="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 outline-none focus:border-primary transition bg-gray-50/50">
                    </div>
                    
                    <!-- Filters dropdown trigger -->
                    <div class="relative" id="student-mgmt-filters-container">
                        <button onclick="toggleStudentMgmtFilters()" class="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition active:scale-95">
                            <i class="fas fa-filter text-gray-400"></i> Filters
                        </button>
                        <!-- Popover -->
                        <div id="student-mgmt-filters-popover" class="hidden absolute right-0 top-full mt-2 w-72 bg-white border border-gray-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] rounded-2xl p-5 z-50 animate-scale-up origin-top-right">
                            <h4 class="font-black text-gray-800 mb-4 text-sm">Filter by</h4>
                            
                            <div class="mb-4">
                                <label class="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Class / Level</label>
                                <select onchange="window.studentsAnalyticsGrade = this.value;" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 outline-none focus:border-primary bg-gray-50/50">
                                    <option value="all">All Levels</option>
                                    \${allGrades.map(g => \`<option value="\${g}" \${window.studentsAnalyticsGrade === g ? 'selected' : ''}>\${g}</option>\`).join('')}
                                </select>
                            </div>
                            
                            <div class="mb-6">
                                <label class="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Location (Section)</label>
                                <select onchange="window.studentsAnalyticsSection = this.value;" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 outline-none focus:border-primary bg-gray-50/50">
                                    <option value="all">All Sections</option>
                                    \${allSections.map(s => \`<option value="\${s}" \${window.studentsAnalyticsSection === s ? 'selected' : ''}>\${s}</option>\`).join('')}
                                </select>
                            </div>

                            <div class="flex justify-end gap-2 pt-2 border-t border-gray-100">
                                <button onclick="window.studentsAnalyticsGrade='all'; window.studentsAnalyticsSection='all'; renderAdminStudentsAnalytics(document.getElementById('content-area'));" class="px-3 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 transition">Reset</button>
                                <button onclick="renderAdminStudentsAnalytics(document.getElementById('content-area'))" class="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-sm hover:bg-primaryDark transition active:scale-95">Apply</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Table / List -->
            <div class="overflow-x-auto flex-1 border border-gray-100 rounded-xl relative z-10">
                <table class="w-full text-left whitespace-nowrap">
                    <thead class="text-xs font-bold text-gray-400 border-b border-gray-100 bg-gray-50/50">
                        <tr>
                            <th class="py-3 px-2 w-10 text-center"><input type="checkbox" class="rounded border-gray-300 accent-primary w-4 h-4 mt-1"></th>
                            <th class="py-3 px-4">Students <i class="fas fa-arrow-down ml-1 text-gray-300"></i></th>
                            <th class="py-3 px-4">Location</th>
                            <th class="py-3 px-4">Level</th>
                            <th class="py-3 px-4">Progress</th>
                            <th class="py-3 px-4 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50 text-sm" id="student-mgmt-tbody">
                        \${studentRowsHtml.length > 0 ? studentRowsHtml : '<tr><td colspan="6" class="text-center py-10 text-gray-400 font-bold italic">No students found matching the criteria.</td></tr>'}
                    </tbody>
                </table>
            </div>
            
            <!-- Pagination footer -->
            <div class="flex justify-between items-center mt-5 text-xs font-bold text-gray-500">
                <button class="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition"><i class="fas fa-chevron-left mr-1"></i> Previous</button>
                <span>Page 1 of 1</span>
                <button class="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition">Next <i class="fas fa-chevron-right ml-1"></i></button>
            </div>
        </div>
    </div>
    \`;

    // Apply any active search filter after re-rendering
    if(window.studentsAnalyticsSearch) {
        filterStudentMgmtList(window.studentsAnalyticsSearch);
    }
}
`;

if (content.match(regex)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content);
    console.log('Successfully replaced renderAdminStudentsAnalytics.');
} else {
    console.log('Regex match failed.');
}
