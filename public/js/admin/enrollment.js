// public/js/admin/enrollment.js
// SHS Subject Enrollment Module — Curriculum Coordinator Only

let enrollmentSearchTerm = '';
let enrollmentSelectedStudent = null;
let enrollmentSelectedTerm = '1';
let currentEnrollmentSubjects = [];

const ALL_SHS_SUBJECTS = [
    'Oral Communication in Context',
    'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino',
    'General Mathematics', 'Earth and Life Science',
    'Pre-Calculus', 'Basic Calculus', 'Personal Development',
    'Physical Education and Health 1', 'Physical Education and Health 2',
    'Physical Education and Health 3', 'Physical Education and Health 4',
    'Reading and Writing Skills', "Pagbasa at Pagsusuri ng Iba't Ibang Teksto",
    'Statistics and Probability', 'Disaster Readiness and Risk Reduction',
    '21st Century Literature from the Philippines and the World',
    'Contemporary Philippine Arts from the Regions',
    'Media and Information Literacy',
    'General Physics 1', 'General Physics 2',
    'General Biology 1', 'General Biology 2',
    'General Chemistry 1', 'General Chemistry 2',
    'Understanding Culture, Society and Politics',
    'Introduction to the Philosophy of the Human Person',
    'Physical Science', 'Computer Systems Servicing NC II',
    'Animation NC II', 'Computer Programming NC III',
    'Bread and Pastry Production NC II', 'Food and Beverage Services NC II',
    'Cookery NC II', 'English for Academic and Professional Purposes',
    'Practical Research 1', 'Practical Research 2',
    'Inquiries, Investigations and Immersion', 'Entrepreneurship', 'Business Math',
    'Organization and Management',
    'Fundamentals of Accountancy, Business and Management 1',
    'Fundamentals of Accountancy, Business and Management 2',
    'Business Finance', 'Applied Economics', 'Business Enterprise Simulation',
    'Philippine Politics and Governance', 'Introduction to World Religions',
    'Disciplines and Ideas in the Social Sciences',
    'Creative Writing', 'Creative Nonfiction',
    'Trends, Networks, and Critical Thinking',
    'Community Engagement, Solidarity, and Citizenship', 'Work Immersion'
];

// Helper: exclude clearly JHS (Grade 7-9) students from SHS enrollment.
// If section name has no grade info at all (e.g. "Emerald"), include it — might be SHS.
function isEligibleForSHSEnrollment(student) {
    const sec = (student.section || '').toLowerCase();
    // Exclude Grade 7, 8, 9 only
    const jhsPatterns = [
        'grade 7', 'gr. 7', 'g7', '7-',
        'grade 8', 'gr. 8', 'g8', '8-',
        'grade 9', 'gr. 9', 'g9', '9-',
    ];
    for (const pattern of jhsPatterns) {
        if (sec.includes(pattern)) return false;
    }
    return true; // Grade 10, 11, 12, or no grade info → show
}

function getEnrollmentBadge(student) {
    const sec = (student.section || '').toLowerCase();
    if (sec.includes('grade 12') || sec.includes('12-') || sec.includes('gr. 12'))
        return { label: 'Grade 12', color: 'bg-purple-100 text-purple-700 border-purple-200' };
    if (sec.includes('grade 11') || sec.includes('11-') || sec.includes('gr. 11'))
        return { label: 'Grade 11', color: 'bg-blue-100 text-blue-700 border-blue-200' };
    if (sec.includes('grade 10') || sec.includes('10-') || sec.includes('gr. 10') || sec.includes('g10'))
        return { label: 'Grade 10', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    if (student.subjects && student.subjects.some(s => ALL_SHS_SUBJECTS.includes(s.n)))
        return { label: 'SHS', color: 'bg-green-100 text-green-700 border-green-200' };
    return null;
}

function buildStudentGrid(filteredStudents) {
    const colors = ['from-blue-500 to-indigo-600', 'from-emerald-500 to-teal-600', 'from-violet-500 to-purple-600', 'from-rose-500 to-pink-600', 'from-amber-500 to-orange-600'];
    
    if (filteredStudents.length === 0) {
        return `
            <div class="flex flex-col items-center justify-center py-24 text-center">
                <div class="w-24 h-24 bg-white rounded-full shadow-md flex items-center justify-center mb-6">
                    <i class="fas fa-filter text-3xl text-gray-300"></i>
                </div>
                <h3 class="text-xl font-bold text-gray-600 mb-2">No students found</h3>
                <p class="text-gray-400 text-sm max-w-xs">Try a different search term.</p>
            </div>`;
    }
    
    return `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        ${filteredStudents.map(s => {
            const badge = getEnrollmentBadge(s);
            const subjectCount = s.subjects ? s.subjects.filter(sub => ALL_SHS_SUBJECTS.includes(sub.n)).length : 0;
            const initials = s.name.split(',')[0].trim().charAt(0);
            const colorIdx = s.name.charCodeAt(0) % colors.length;
            return `
            <div onclick="openStudentEnrollment('${s.lrn}')" 
                 class="group bg-white rounded-2xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-lg hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                <div class="absolute top-0 right-0 w-24 h-24 opacity-5 rounded-full -mr-8 -mt-8 bg-gradient-to-br ${colors[colorIdx]}"></div>
                <div class="flex items-start gap-4 mb-4">
                    <div class="w-12 h-12 rounded-xl bg-gradient-to-br ${colors[colorIdx]} flex items-center justify-center text-white text-xl font-black shadow-md flex-shrink-0">
                        ${initials}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="font-bold text-gray-800 text-sm leading-tight truncate group-hover:text-primary transition-colors">${s.name}</div>
                        <div class="text-gray-400 text-xs font-mono mt-0.5">${s.lrn}</div>
                    </div>
                </div>
                <div class="flex items-center justify-between">
                    <div class="text-xs font-semibold text-gray-500 truncate max-w-[120px]" title="${s.section || 'No Section'}">
                        <i class="fas fa-door-open text-gray-300 mr-1"></i>${s.section || 'No Section'}
                    </div>
                    ${badge ? `<span class="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${badge.color}">${badge.label}</span>` : ''}
                </div>
                ${subjectCount > 0 ? `
                    <div class="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
                        <div class="flex -space-x-1">${Array.from({length: Math.min(subjectCount, 3)}).map(() => `<div class="w-2 h-2 rounded-full bg-green-400 border border-white"></div>`).join('')}</div>
                        <span class="text-[10px] font-bold text-green-600">${subjectCount} subject${subjectCount > 1 ? 's' : ''} enrolled</span>
                    </div>
                ` : `
                    <div class="mt-3 pt-3 border-t border-gray-50">
                        <span class="text-[10px] font-bold text-gray-400">No subjects yet</span>
                    </div>
                `}
                <div class="absolute bottom-4 right-4 w-7 h-7 rounded-full bg-gray-50 group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-all duration-300">
                    <i class="fas fa-chevron-right text-[10px] text-gray-400 group-hover:text-white"></i>
                </div>
            </div>`;
        }).join('')}
    </div>`;
}

// Only re-renders the student grid (not the whole page) — keeps search input focused!
function filterStudentGrid() {
    const grid = document.getElementById('enrollment-student-grid');
    if (!grid) return;
    const term = enrollmentSearchTerm.toLowerCase();
    // Always exclude Grade 7-9 students
    let filtered = students.filter(isEligibleForSHSEnrollment);
    if (term) {
        filtered = filtered.filter(s =>
            s.name.toLowerCase().includes(term) ||
            s.lrn.includes(term) ||
            (s.section || '').toLowerCase().includes(term)
        );
    }
    grid.innerHTML = buildStudentGrid(filtered);

    // Update visible count badge
    const visibleBadge = document.getElementById('enrollment-visible-count');
    if (visibleBadge) visibleBadge.textContent = filtered.length;
}

function renderEnrollment(container) {
    if (currentUser.role !== 'admin' && currentUser.role !== 'principal' && currentUser.role !== 'curriculum_coordinator') {
        container.innerHTML = `<div class="p-8 text-red-500">Access Denied.</div>`;
        return;
    }

    const enrolledCount = students.filter(s => s.subjects && s.subjects.some(sub => ALL_SHS_SUBJECTS.includes(sub.n))).length;
    const grade10Count = students.filter(s => {
        const sec = (s.section || '').toLowerCase();
        return sec.includes('grade 10') || sec.includes('gr. 10') || sec.includes('g10') || sec.includes('10-');
    }).length;

    // Initial filtered list — exclude Grade 7-9
    let initFiltered = students.filter(isEligibleForSHSEnrollment);
    if (enrollmentSearchTerm) {
        const t = enrollmentSearchTerm.toLowerCase();
        initFiltered = students.filter(s =>
            s.name.toLowerCase().includes(t) || s.lrn.includes(t) || (s.section || '').toLowerCase().includes(t)
        );
    }

    container.innerHTML = `
        <div class="h-full flex flex-col" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);">
            
            <!-- Header Banner -->
            <div class="relative overflow-hidden px-8 pt-8 pb-6" style="background: linear-gradient(135deg, #1e3a5f 0%, #2d6a4f 100%);">
                <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px); background-size: 40px 40px;"></div>
                <div class="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl -mr-20 -mt-20" style="background: #22d3ee;"></div>
                
                <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 class="text-3xl font-black text-white tracking-tight mb-1 drop-shadow">SHS Subject Enrollment</h1>
                        <p class="text-white/60 text-sm font-medium">Assign subjects to Senior High School students per term</p>
                    </div>
                    <!-- Stats Pills -->
                    <div class="flex gap-3 flex-wrap">
                        <div class="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center min-w-[90px]">
                            <div class="text-2xl font-black text-white">${grade10Count}</div>
                            <div class="text-white/60 text-[10px] font-bold uppercase tracking-widest">Grade 10</div>
                        </div>
                        <div class="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center min-w-[90px]">
                            <div class="text-2xl font-black text-white">${enrolledCount}</div>
                            <div class="text-white/60 text-[10px] font-bold uppercase tracking-widest">Enrolled</div>
                        </div>
                        <div class="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center min-w-[90px]">
                            <div id="enrollment-visible-count" class="text-2xl font-black text-white">${initFiltered.length}</div>
                            <div class="text-white/60 text-[10px] font-bold uppercase tracking-widest">Visible</div>
                        </div>
                    </div>
                </div>

                <!-- Search Bar (oninput calls filterStudentGrid — does NOT re-render the whole page) -->
                <div class="relative z-10 mt-6">
                    <div class="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                        <i class="fas fa-search text-white/40 text-base"></i>
                    </div>
                    <input type="text" id="enrollment-student-filter" 
                        placeholder="Filter by name, LRN, or section..." 
                        class="w-full pl-12 pr-5 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/15 transition-all font-medium text-sm"
                        value="${enrollmentSearchTerm}"
                        oninput="enrollmentSearchTerm=this.value; filterStudentGrid();">
                </div>
            </div>

            <!-- Student Grid (this div is updated by filterStudentGrid — search input stays focused!) -->
            <div class="flex-1 overflow-y-auto p-6 md:p-8">
                <div id="enrollment-student-grid">
                    ${buildStudentGrid(initFiltered)}
                </div>
            </div>
        </div>

        <!-- Detail Slide Panel (Modal) -->
        <div id="enrollment-panel-overlay" class="fixed inset-0 z-50 hidden" onclick="closeEnrollmentPanel(event)">
            <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
            <div id="enrollment-panel" class="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col translate-x-full transition-transform duration-300">
                <div id="enrollment-panel-content" class="flex flex-col h-full overflow-hidden"></div>
            </div>
        </div>
    `;
}

function openStudentEnrollment(lrn) {
    enrollmentSelectedStudent = students.find(s => s.lrn === lrn);
    enrollmentSelectedTerm = window.currentRecordQuarter ? String(window.currentRecordQuarter) : '1';
    currentEnrollmentSubjects = [];

    const overlay = document.getElementById('enrollment-panel-overlay');
    const panel = document.getElementById('enrollment-panel');
    overlay.classList.remove('hidden');
    setTimeout(() => panel.classList.remove('translate-x-full'), 10);
    renderEnrollmentPanel();
}

function closeEnrollmentPanel(e) {
    if (e && e.target !== document.getElementById('enrollment-panel-overlay')?.firstElementChild) return;
    _closePanel();
}
function closeEnrollmentPanelBtn() { _closePanel(); }
function _closePanel() {
    const panel = document.getElementById('enrollment-panel');
    if (panel) panel.classList.add('translate-x-full');
    setTimeout(() => {
        const overlay = document.getElementById('enrollment-panel-overlay');
        if (overlay) overlay.classList.add('hidden');
    }, 300);
    enrollmentSelectedStudent = null;
    currentEnrollmentSubjects = [];
    // Just refresh grid cards to show updated subject counts
    filterStudentGrid();
}

function renderEnrollmentPanel() {
    const s = enrollmentSelectedStudent;
    if (!s) return;
    const targetQ = parseInt(enrollmentSelectedTerm);
    const alreadyEnrolled = s.subjects
        ? s.subjects.filter(sub => parseInt(sub.quarter) === targetQ && ALL_SHS_SUBJECTS.includes(sub.n)).map(sub => sub.n)
        : [];
    const pendingNew = currentEnrollmentSubjects.filter(sub => !alreadyEnrolled.includes(sub));
    const allShown = [...alreadyEnrolled, ...pendingNew];

    const colors = ['from-blue-500 to-indigo-600', 'from-emerald-500 to-teal-600', 'from-violet-500 to-purple-600', 'from-rose-500 to-pink-600', 'from-amber-500 to-orange-600'];
    const colorIdx = s.name.charCodeAt(0) % colors.length;

    document.getElementById('enrollment-panel-content').innerHTML = `
        <!-- Panel Header -->
        <div class="relative overflow-hidden px-6 py-8 flex-shrink-0" style="background: linear-gradient(135deg, #1e3a5f 0%, #2d6a4f 100%);">
            <div class="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <button onclick="closeEnrollmentPanelBtn()" class="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors text-white z-10">
                <i class="fas fa-times"></i>
            </button>
            <div class="flex items-center gap-5 relative z-10">
                <div class="w-16 h-16 rounded-2xl bg-gradient-to-br ${colors[colorIdx]} flex items-center justify-center text-white text-2xl font-black shadow-xl border-2 border-white/30">
                    ${s.name.charAt(0)}
                </div>
                <div>
                    <h2 class="text-xl font-black text-white">${s.name}</h2>
                    <div class="flex items-center gap-3 mt-1 flex-wrap">
                        <span class="text-white/60 text-xs font-mono">${s.lrn}</span>
                        <span class="px-2 py-0.5 bg-white/15 rounded-full text-white/80 text-[10px] font-bold uppercase tracking-wider">${s.section || 'No Section'}</span>
                    </div>
                </div>
            </div>
            <!-- Term Selector -->
            <div class="flex gap-2 mt-5 relative z-10">
                ${['1','2','3'].map(t => `
                    <button onclick="enrollmentSelectedTerm='${t}'; currentEnrollmentSubjects=[]; renderEnrollmentPanel();" 
                        class="flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${enrollmentSelectedTerm === t ? 'bg-white text-gray-800 shadow-md' : 'bg-white/10 text-white/70 hover:bg-white/20'}">
                        Term ${t}
                    </button>
                `).join('')}
            </div>
        </div>

        <!-- Subject Picker -->
        <div class="flex-1 flex flex-col overflow-hidden px-6 py-5">
            <div class="flex items-center justify-between mb-4">
                <div>
                    <h3 class="font-black text-gray-800 text-base">Assigned Subjects</h3>
                    <p class="text-xs text-gray-400 font-medium mt-0.5">Term ${targetQ} &bull; ${alreadyEnrolled.length} enrolled${pendingNew.length > 0 ? `, ${pendingNew.length} unsaved` : ''}</p>
                </div>
                <button onclick="enrollStudent()" id="btn-enroll-save" 
                    class="px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md text-white flex items-center gap-2"
                    style="background: linear-gradient(135deg, #1e3a5f, #2d6a4f);">
                    <i class="fas fa-save"></i> Save
                </button>
            </div>

            <!-- Search to Add (this input is separate — won't get destroyed) -->
            <div class="relative mb-4">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <i class="fas fa-plus text-primary text-xs"></i>
                </div>
                <input type="text" id="subject-search" 
                    placeholder="Search subject to add..."
                    autocomplete="off"
                    class="w-full pl-10 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-primary focus:bg-white outline-none transition-all text-gray-700 font-bold text-sm placeholder-gray-400"
                    onfocus="showSubjectDropdown(this.value)"
                    oninput="showSubjectDropdown(this.value)">
                <div id="subject-autocomplete" 
                    class="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-2xl hidden max-h-56 overflow-y-auto"></div>
            </div>

            <!-- Subject List -->
            <div class="flex-1 overflow-y-auto space-y-2 pr-1">
                ${allShown.length === 0 ? `
                    <div class="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                        <i class="fas fa-book-open text-4xl mb-3 text-gray-200"></i>
                        <p class="font-semibold text-gray-500 text-sm">No subjects for Term ${targetQ} yet</p>
                        <p class="text-xs mt-1">Search above to add subjects</p>
                    </div>
                ` : allShown.map(sub => {
                    const isSaved = alreadyEnrolled.includes(sub);
                    const escapedSub = sub.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                    return `
                    <div class="flex items-center gap-3 p-3 ${isSaved ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-100'} rounded-xl group transition-all">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSaved ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}">
                            <i class="fas ${isSaved ? 'fa-check' : 'fa-star'} text-xs"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="font-bold text-gray-800 text-sm truncate" title="${sub}">${sub}</div>
                            <div class="text-[10px] font-black uppercase tracking-widest ${isSaved ? 'text-green-500' : 'text-amber-500'}">${isSaved ? 'Enrolled' : 'Unsaved'}</div>
                        </div>
                        <button onclick="removeEnrollmentSubject('${escapedSub}')" 
                            class="w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                            <i class="fas fa-times text-xs"></i>
                        </button>
                    </div>`;
                }).join('')}
            </div>
        </div>
    `;
}

function showSubjectDropdown(val) {
    const dropdown = document.getElementById('subject-autocomplete');
    if (!dropdown) return;
    const targetQ = parseInt(enrollmentSelectedTerm);
    const alreadyEnrolled = enrollmentSelectedStudent && enrollmentSelectedStudent.subjects
        ? enrollmentSelectedStudent.subjects.filter(s => parseInt(s.quarter) === targetQ).map(s => s.n)
        : [];
    const allAdded = [...alreadyEnrolled, ...currentEnrollmentSubjects];
    const term = (val || '').toLowerCase();
    let filtered = ALL_SHS_SUBJECTS.filter(s => !allAdded.includes(s));
    if (term) filtered = filtered.filter(s => s.toLowerCase().includes(term));
    const shown = filtered.slice(0, term ? 10 : 12);

    dropdown.innerHTML = shown.length === 0
        ? `<div class="px-4 py-3 text-sm text-gray-400 font-medium">All subjects added or no match.</div>`
        : shown.map(s => `
            <div class="px-4 py-3 hover:bg-primary/5 cursor-pointer border-b border-gray-50 last:border-0 font-semibold text-gray-700 text-sm transition-colors flex items-center gap-3"
                 onclick="addSpecificSubject('${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')">
                <i class="fas fa-plus-circle text-primary/40 text-xs flex-shrink-0"></i>${s}
            </div>
        `).join('');
    dropdown.classList.remove('hidden');

    setTimeout(() => {
        document.addEventListener('click', function closeDropdown(e) {
            if (!e.target.closest('#subject-autocomplete') && !e.target.closest('#subject-search')) {
                dropdown.classList.add('hidden');
                document.removeEventListener('click', closeDropdown);
            }
        });
    }, 100);
}

function addSpecificSubject(sub) {
    if (!currentEnrollmentSubjects.includes(sub)) currentEnrollmentSubjects.push(sub);
    const searchInput = document.getElementById('subject-search');
    if (searchInput) searchInput.value = '';
    document.getElementById('subject-autocomplete')?.classList.add('hidden');
    renderEnrollmentPanel();
}

function removeEnrollmentSubject(sub) {
    if (currentEnrollmentSubjects.includes(sub)) {
        currentEnrollmentSubjects = currentEnrollmentSubjects.filter(s => s !== sub);
        renderEnrollmentPanel();
    } else {
        if (confirm(`Remove "${sub}" from this student's enrollment?`)) {
            if (enrollmentSelectedStudent) {
                const targetQ = parseInt(enrollmentSelectedTerm);
                enrollmentSelectedStudent.subjects = enrollmentSelectedStudent.subjects
                    .filter(x => !(x.n === sub && parseInt(x.quarter) === targetQ));
            }
            renderEnrollmentPanel();
        }
    }
}

async function enrollStudent() {
    if (!enrollmentSelectedStudent || currentEnrollmentSubjects.length === 0) {
        showMessage("No new subjects to save.", true);
        return;
    }
    const btn = document.getElementById('btn-enroll-save');
    if (btn) { btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`; btn.disabled = true; }

    const s = enrollmentSelectedStudent;
    const targetQ = parseInt(enrollmentSelectedTerm);
    const sy = window.currentRecordSchoolYear || '2025-2026';
    let successCount = 0;

    for (const sub of currentEnrollmentSubjects) {
        try {
            const exists = s.subjects && s.subjects.find(x => x.n === sub && parseInt(x.quarter) === targetQ);
            if (exists) continue;
            await fetch('/api/grades/save-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ lrn: s.lrn, subject: sub, scores: {}, grade: null, gwa: s.gwa ?? null, quarter: targetQ, school_year: sy })
            });
            if (!s.subjects) s.subjects = [];
            s.subjects.push({ n: sub, g: null, quarter: targetQ });
            successCount++;
        } catch (e) { console.error("Failed to enroll:", sub, e); }
    }
    showMessage(`✅ Enrolled ${successCount} subjects for Term ${targetQ}.`);
    currentEnrollmentSubjects = [];
    renderEnrollmentPanel();
}
