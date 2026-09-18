/**
 * admin/records.js — Records / Grading page render functions
 *
 * Admin flow (3-level drill-down):
 *   1. Teachers list (with search bar)
 *   2. Click a teacher → see their sections
 *   3. Click a section → see all student records for that section
 *
 * Adviser Teacher flow (read-only):
 *   1. Section list for the adviser's handled sections
 *   2. Click a section → read-only student records (all subjects)
 *
 * Regular Teacher flow: straight to editable Master Academic Records
 */

// ─── DRILL-DOWN STATE (admin / adviser) ──────────────────────────────────────
let adminSelectedTeacher = null;
let adminSelectedSection = null;
let adviserSelectedSection = null; // for adviser teacher drill-down
let adminLevelFilter = 'ALL'; // 'ALL' | 'JH' | 'SH'

let currentAttendanceView = null; // null | sectionName
let currentAttendanceMonth = (function () {
    const cur = new Date().toLocaleString('en-US', { month: 'short' });
    return ATT_MONTHS.find(m => m.m === cur)?.m || ATT_MONTHS[0].m;
})();
let fetchedAttendanceSections = new Set();

// ─── STUDENTS ANALYTICS STATE ────────────────────────────────────────────────
let adminRecordsTab = 'teachers'; // 'teachers' | 'students'
let studentsAnalyticsLevel = 'ALL';   // 'ALL' | 'JH' | 'SH'
let studentsAnalyticsGrade = 'all';   // 'all' | 'Grade 7' ... 'Grade 12'
let studentsAnalyticsStrand = 'all';  // 'all' | 'ABM' | 'STEM' ...

window.currentRecordSchoolYear = '2025-2026';
window.currentRecordSemester = 1;



function setRecordQuarter(q) {
    window.currentRecordQuarter = q;
    window.currentRecordSemester = null;
    students.forEach(s => {
        if (s.allSubjects) {
            if (q === 'ALL') {
                const subjectMap = {};
                s.allSubjects.forEach(sub => {
                    if (!subjectMap[sub.n]) subjectMap[sub.n] = [];
                    subjectMap[sub.n].push(sub.g || 0);
                });
                s.subjects = Object.keys(subjectMap).map(subName => {
                    const grades = subjectMap[subName];
                    const avg = (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2);
                    return { n: subName, g: parseFloat(avg), quarter: 'ALL' };
                });
            } else {
                s.subjects = s.allSubjects.filter(sub => (sub.quarter || 1) == q);
                s.subjects.forEach(sub => recalcStudentSubject(s, sub.n));
            }
            computeStudentGWA(s);
        }
    });
    renderRecords(document.getElementById('content-area'));
    if (adviserSelectedSection) renderAdviserSectionStudents(document.getElementById('content-area'));
}

function setRecordSemester(sem) {
    window.currentRecordSemester = sem;
    window.currentRecordQuarter = null;
    const semQuarters = sem === 1 ? [1, 2] : [3, 4];

    students.forEach(s => {
        if (s.allSubjects) {
            const subjectMap = {};
            s.allSubjects.forEach(sub => {
                if (semQuarters.includes(sub.quarter || 1)) {
                    if (!subjectMap[sub.n]) subjectMap[sub.n] = [];
                    // Only push valid transmuted quarterly grades (sub.g) that have been computed
                    const g = parseFloat(sub.g);
                    if (!isNaN(g)) {
                        subjectMap[sub.n].push(g);
                    }
                }
            });
            s.subjects = Object.keys(subjectMap).map(subName => {
                const grades = subjectMap[subName];
                let avg = null;
                if (grades.length > 0) {
                    // Standard DepEd Semester Final Grade is the exact mathematical average of the two quarterly grades
                    avg = (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(0);
                }
                return { n: subName, g: avg !== null ? parseInt(avg) : null };
            });
            computeStudentGWA(s);
        }
    });
    renderRecords(document.getElementById('content-area'));
    if (adviserSelectedSection) renderAdviserSectionStudents(document.getElementById('content-area'));
}

// ─── ENTRY POINT ─────────────────────────────────────────────────────────────
function renderRecords(container) {
    if (currentUser.role === 'teacher') {
        loadPinnedSections();
        // Build handledSections from both Advisory sections and Subject-based discovery
        const adviserSections = (currentUser.section || '').split(',').map(s => s.trim()).filter(Boolean);
        const subjects = (currentUser.subject || '').split(',').map(s => s.trim()).filter(Boolean);
        const teacherSections = new Set(adviserSections);

        // Include explicitly pinned sections so teachers can see and grade new empty sections
        pinnedSections.forEach(sec => {
            if (sec !== 'all') teacherSections.add(sec);
        });

        // Subject-based discovery: sections where this teacher already has students/grades
        if (subjects.length > 0) {
            students.forEach(s => {
                if (s.subjects && s.subjects.some(sub => subjects.includes(sub.n))) {
                    teacherSections.add(s.section);
                }
            });
        }

        currentUser.handledSections = [...teacherSections].sort();

        if (currentSubjectView) {
            renderDetailedSubjectView(container, currentSubjectView);
        } else if (currentAttendanceView) {
            renderAttendanceView(container, currentAttendanceView);
        } else {
            renderMasterRecordsView(container);
        }
        return;
    }

    // ── Admin drill-down ──
    if (adminRecordsTab === 'students') {
        renderAdminStudentsAnalytics(container);
    } else if (adminSelectedSection && adminSelectedTeacher) {
        renderAdminSectionStudents(container);
    } else if (adminSelectedTeacher) {
        renderAdminTeacherSections(container);
    } else {
        renderAdminTeacherList(container);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADVISER TEACHER: Level 1 — Section List (read-only)
// ─────────────────────────────────────────────────────────────────────────────
function renderAdviserRecords(container) {
    if (adviserSelectedSection) {
        renderAdviserSectionStudents(container);
    } else {
        renderAdviserSectionList(container);
    }
}

function renderAdviserSectionList(container) {
    const sectionList = (currentUser.section || '').split(',').map(s => s.trim()).filter(Boolean);
    const initials = currentUser.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    let sectionGrid = '';
    if (sectionList.length === 0) {
        sectionGrid = '<div class="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100"><i class="fas fa-folder-open text-4xl mb-3 opacity-30"></i><p class="font-semibold">No sections assigned yet.</p><button onclick="promptAddAdviserSection()" class="mt-4 px-4 py-2 border border-primary text-primary rounded-xl text-xs font-bold shadow-sm hover:bg-green-50 transition"><i class="fas fa-plus mr-1"></i> Add an Advisory Section</button></div>';
    } else {
        const cards = sectionList.map(sec => {
            const ss = students.filter(s => s.section === sec);
            const atRisk = ss.filter(s => s.gwa > 0 && s.gwa < 75).length;
            const withGrades = ss.filter(s => s.gwa > 0).length;
            const riskColor = atRisk > 0 ? 'text-red-500' : 'text-gray-400';
            return `<div class="relative group">
                <div onclick="adviserSelectedSection = '${sec}'; renderAdviserRecords(document.getElementById('content-area'));" 
                    class="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary/40 cursor-pointer transition-all duration-200 h-full">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-primary">
                                <i class="fas fa-chalkboard text-base"></i>
                            </div>
                            <div>
                                <h4 class="font-bold text-gray-900 group-hover:text-primary transition-colors">${sec}</h4>
                                <p class="text-[11px] text-gray-400">${ss.length} student${ss.length !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        <i class="fas fa-chevron-right text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all"></i>
                    </div>
                    <div class="grid grid-cols-3 gap-2 bg-gray-50 rounded-xl p-3">
                        <div class="text-center">
                            <p class="text-lg font-bold text-gray-800">${ss.length}</p>
                            <p class="text-[10px] text-gray-400 uppercase">Total</p>
                        </div>
                        <div class="text-center border-x border-gray-200">
                            <p class="text-lg font-bold text-blue-600">${withGrades}</p>
                            <p class="text-[10px] text-gray-400 uppercase">Graded</p>
                        </div>
                        <div class="text-center">
                            <p class="text-lg font-bold ${riskColor}">${atRisk}</p>
                            <p class="text-[10px] text-gray-400 uppercase">At Risk</p>
                        </div>
                    </div>
                </div>
                <!-- Delete Button -->
                <button onclick="event.stopPropagation(); removeAdviserSection('${sec}')" 
                    class="absolute top-2 right-10 w-8 h-8 rounded-lg bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm z-10" 
                    title="Remove Section">
                    <i class="fas fa-trash-alt text-xs"></i>
                </button>
            </div>`;
        }).join('');
        sectionGrid = '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">' + cards + '</div>';
    }

    container.innerHTML = `
        <div class="flex flex-col gap-6 animate-slide-up">
            <div class="bg-gradient-to-r from-primary to-green-800 rounded-2xl p-6 text-white shadow-md">
                <div class="flex items-center justify-between gap-4">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center font-bold text-xl shadow-inner">${initials}</div>
                        <div>
                            <h2 class="text-xl font-bold">${currentUser.name}</h2>
                            <p class="text-green-200 text-sm">Class Adviser</p>
                            <p class="text-[11px] text-green-300 mt-1 uppercase tracking-wide font-semibold">${sectionList.length} Section${sectionList.length !== 1 ? 's' : ''} Handled</p>
                        </div>
                    </div>
                    <div>
                        <button onclick="promptAddAdviserSection()" class="px-3 py-1.5 md:px-4 md:py-2 bg-white text-primary rounded-xl text-xs font-bold shadow-sm hover:bg-green-50 transition whitespace-nowrap">
                            <i class="fas fa-plus mr-1"></i> Add Section
                        </button>
                    </div>
                </div>
            </div>
            <div>
                <h3 class="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                    <i class="fas fa-eye text-primary mr-2"></i>Read-Only — Your Advisory Sections
                </h3>
                ${sectionGrid}
            </div>
        </div>
    `;
}

function promptAddAdviserSection() {
    const allSections = [...new Set(students.map(s => s.section).filter(Boolean))].sort();
    const advisedSections = teachers.filter(t => t.is_adviser).flatMap(t => (t.section || '').split(',').map(s => s.trim()).filter(Boolean));
    const availableSections = allSections.filter(sec => !advisedSections.includes(sec));

    let jhsSections = availableSections.filter(sec => !sec.startsWith('11') && !sec.startsWith('12'));
    let shsSections = availableSections.filter(sec => sec.startsWith('11') || sec.startsWith('12'));

    const myTeacherRec = teachers.find(t => t.id === currentUser.id);
    const myLevel = myTeacherRec ? (myTeacherRec.level || 'JH') : 'JH';

    // Enforce Level Constraints
    if (myLevel === 'JH') shsSections = [];
    if (myLevel === 'SH') jhsSections = [];

    const overlay = document.createElement('div');
    overlay.id = 'add-adviser-sec-modal';
    overlay.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in';

    let listHTML = '';
    if (jhsSections.length === 0 && shsSections.length === 0) {
        listHTML = '<div class="p-6 text-center text-gray-400 italic text-sm">No available sections remaining for your assigned level.</div>';
    } else {
        if (jhsSections.length > 0) {
            listHTML += '<div class="px-4 py-2 border-y border-green-100 text-[10px] font-bold text-primary uppercase tracking-widest bg-green-50 sticky top-0 z-10">Junior High School</div>';
            listHTML += jhsSections.map(sec => `
                <div onclick="selectAdviserSectionCell(this, '${sec}')" class="adviser-section-option px-5 py-3.5 cursor-pointer hover:bg-green-50 transition border-b border-gray-100 last:border-0 text-sm text-gray-700 font-medium flex justify-between items-center group">
                    <span>${sec}</span><i class="fas fa-check text-white group-[.selected]:text-primary transition opacity-0 group-[.selected]:opacity-100"></i>
                </div>
            `).join('');
        }
        if (shsSections.length > 0) {
            listHTML += '<div class="px-4 py-2 border-y border-blue-100 text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 sticky top-0 z-10">Senior High School</div>';
            listHTML += shsSections.map(sec => `
                <div onclick="selectAdviserSectionCell(this, '${sec}')" class="adviser-section-option px-5 py-3.5 cursor-pointer hover:bg-blue-50 transition border-b border-gray-100 last:border-0 text-sm text-gray-700 font-medium flex justify-between items-center group">
                    <span>${sec}</span><i class="fas fa-check text-white group-[.selected]:text-blue-600 transition opacity-0 group-[.selected]:opacity-100"></i>
                </div>
            `).join('');
        }
    }

    overlay.innerHTML = `
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-scale-up flex flex-col max-h-[90vh]">
            <div class="shrink-0 mb-5">
                <h3 class="text-xl font-bold text-gray-800 mb-1.5">Select Advisory Section</h3>
                <p class="text-xs text-gray-400 leading-relaxed">Search and choose a section to act as their Adviser.</p>
            </div>
            
            <div class="shrink-0 mb-4 relative">
                <i class="fas fa-search absolute left-4 top-3.5 text-gray-400"></i>
                <input type="text" id="search-adviser-section" placeholder="Search sections..." class="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition" onkeyup="filterAdviserSections(this.value)">
            </div>
            
            <div class="flex-1 overflow-y-auto mb-6 bg-white border border-gray-200 rounded-xl relative shadow-inner h-64 select-none">
                ${listHTML}
            </div>
            
            <input type="hidden" id="selected-adviser-section" value="">
            
            <div class="shrink-0 flex gap-3">
                <button onclick="document.getElementById('add-adviser-sec-modal').remove()" class="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 transition">Cancel</button>
                <button id="confirm-add-adviser-sec" class="flex-1 py-3.5 bg-primary text-white rounded-xl text-xs font-bold shadow-md hover:bg-primaryDark transition disabled:opacity-50 disabled:cursor-not-allowed" disabled>Assign Section</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Dynamic global helper injection for specific UI element functionality
    window.selectAdviserSectionCell = function (element, secName) {
        document.querySelectorAll('.adviser-section-option').forEach(el => {
            el.classList.remove('bg-green-100/50', 'bg-blue-100/50', 'selected');
        });
        element.classList.add(secName.startsWith('11') || secName.startsWith('12') ? 'bg-blue-100/50' : 'bg-green-100/50', 'selected');
        document.getElementById('selected-adviser-section').value = secName;
        document.getElementById('confirm-add-adviser-sec').disabled = false;
    };

    window.filterAdviserSections = function (query) {
        const q = query.toLowerCase();
        let anyVisible = false;
        document.querySelectorAll('.adviser-section-option').forEach(el => {
            const text = el.innerText.toLowerCase();
            if (text.includes(q)) {
                el.classList.remove('hidden');
                el.classList.add('flex');
                anyVisible = true;
            } else {
                el.classList.add('hidden');
                el.classList.remove('flex');
            }
        });
    };

    document.getElementById('confirm-add-adviser-sec').onclick = async () => {
        const selected = document.getElementById('selected-adviser-section').value;
        if (!selected) return;

        const btn = document.getElementById('confirm-add-adviser-sec');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Assiging...';

        await performAddAdviserSection(selected);
        overlay.remove();
    };
}

async function performAddAdviserSection(trimmedSec) {
    let secList = (currentUser.section || '').split(',').map(s => s.trim()).filter(Boolean);

    // Check if duplicate
    if (secList.some(s => s.toLowerCase() === trimmedSec.toLowerCase())) {
        showMessage("You are already advising this section.", true);
        return;
    }

    secList.push(trimmedSec);
    const updatedSections = secList.join(', ');

    try {
        const payload = {
            section: updatedSections,
            is_adviser: true // Ensure is_adviser is true when adding a section
        };
        const res = await fetch('/api/teachers/' + currentUser.db_id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (!res.ok) {
            showMessage(data.error || 'Failed to update advisory section.', true);
            return;
        }

        // Locally update the current user object
        currentUser.section = updatedSections;
        currentUser.isAdviser = true;
        sessionStorage.setItem('cnhs_session', JSON.stringify(currentUser));

        // Update navigation if it was hidden
        document.getElementById('nav-adviser')?.classList.remove('hidden');

        logActivity('Added advisory section: ' + trimmedSec);
        showMessage('Advisory section added successfully.');

        // Re-render
        renderAdviserRecords(document.getElementById('content-area'));

        // Refresh app state's teachers list to reflect the new adviser status for other logic
        const teachRes = await fetch('/api/teachers', { headers: { 'Accept': 'application/json' } });
        if (teachRes.ok) teachers = await teachRes.json();

    } catch (err) {
        showMessage('Network error. Please try again.', true);
    }
}

async function removeAdviserSection(secToRemove) {
    if (!confirm(`Are you sure you want to remove ${secToRemove} from your advisory sections?`)) return;

    let secList = (currentUser.section || '').split(',').map(s => s.trim()).filter(Boolean);
    secList = secList.filter(s => s !== secToRemove);

    const updatedSections = secList.join(', ');
    const stillAdviser = secList.length > 0;

    try {
        const payload = {
            section: updatedSections,
            is_adviser: stillAdviser
        };
        const res = await fetch('/api/teachers/' + currentUser.db_id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const data = await res.json();
            showMessage(data.error || 'Failed to remove advisory section.', true);
            return;
        }

        // Locally update
        currentUser.section = updatedSections;
        currentUser.isAdviser = stillAdviser;
        sessionStorage.setItem('cnhs_session', JSON.stringify(currentUser));

        if (!stillAdviser) {
            document.getElementById('nav-adviser')?.classList.add('hidden');
            navigate('dashboard');
        }

        logActivity('Removed advisory section: ' + secToRemove);
        showMessage('Advisory section removed.');

        // Refresh teachers list
        const teachRes = await fetch('/api/teachers', { headers: { 'Accept': 'application/json' } });
        if (teachRes.ok) teachers = await teachRes.json();

        renderAdviserRecords(document.getElementById('content-area'));
    } catch (err) {
        showMessage('Network error.', true);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADVISER TEACHER: Level 2 — Students (read-only, all subjects)
// ─────────────────────────────────────────────────────────────────────────────
let adviserSearch = '';

function renderAdviserSectionStudents(container) {
    const sec = adviserSelectedSection;
    if (!sec) { renderAdviserSectionList(container); return; }

    const search = adviserSearch.toLowerCase();
    let secStudents = students.filter(s => s.section === sec);
    if (search) secStudents = secStudents.filter(s => s.name.toLowerCase().includes(search) || s.lrn.includes(search));

    const subjectHeaders = coreSubjects.map(sub => '<th class="static-cell text-gray-600">' + sub + '</th>').join('');

    const rows = secStudents.length === 0
        ? '<tr><td colspan="30" class="py-12 text-center text-gray-400 italic">No students found.</td></tr>'
        : secStudents.map(s => {
            const isSemMode = window.currentRecordSemester !== null;
            const semQuarters = window.currentRecordSemester === 1 ? [1, 2] : [3, 4];

            let studentSemGrades = [];

            const subCols = coreSubjects.map(subName => {
                let grade = '-';
                if (window.currentRecordSemester) {
                    // Semester Mode: Average of Q1/Q2 or Q3/Q4
                    const subGrades = (s.allSubjects || []).filter(x => x.n === subName && semQuarters.includes(x.quarter || 1));
                    if (subGrades.length > 0) {
                        const sum = subGrades.reduce((acc, x) => acc + (x.g || 0), 0);
                        grade = (sum / subGrades.length).toFixed(2);
                        studentSemGrades.push(parseFloat(grade));
                    }
                } else {
                    // Quarter Mode (default behavior)
                    const subData = s.subjects && s.subjects.find(x => x.n === subName);
                    grade = subData && subData.g !== null && subData.g !== undefined ? subData.g : '-';
                }
                const color = (grade !== '-' && grade < 75) ? 'text-red-500 font-bold' : 'text-gray-700';
                return '<td class="static-cell ' + color + '">' + grade + '</td>';
            }).join('');

            let displayGWA = '-';
            if (window.currentRecordSemester) {
                if (studentSemGrades.length > 0) {
                    displayGWA = (studentSemGrades.reduce((a, b) => a + b, 0) / studentSemGrades.length).toFixed(2);
                }
            } else {
                displayGWA = s.gwa > 0 ? s.gwa : '-';
            }

            let badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500">No Grades</span>';
            const gwaVal = parseFloat(displayGWA);
            if (!isNaN(gwaVal)) {
                const isSH = window.currentRecordGradeLevel >= 11;
                const hasFailing = s.grades && Object.values(s.grades).some(g => parseFloat(g) < 75);

                if (isSH) {
                    if (gwaVal >= 90 && !hasFailing) {
                        badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-700 font-bold">Academic Excellence Award</span>';
                    } else if (gwaVal >= 75) {
                        badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-green-100 text-green-600 font-bold">Regular</span>';
                    } else if (gwaVal > 0) {
                        badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-600 font-bold">Failing</span>';
                    }
                } else {
                    if (gwaVal >= 98 && !hasFailing) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-700 font-bold">Highest Honor</span>';
                    else if (gwaVal >= 95 && !hasFailing) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 font-bold">High Honor</span>';
                    else if (gwaVal >= 90 && !hasFailing) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-bold">With Honor</span>';
                    else if (gwaVal >= 75) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-green-100 text-green-600 font-bold">Regular</span>';
                    else if (gwaVal > 0) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-600 font-bold">Failing</span>';
                }
            }

            return '<tr class="hover:bg-blue-50/30 transition border-b border-gray-50">' +
                '<td class="student-name border-r border-gray-100 font-semibold text-gray-800">' + s.name + '</td>' +
                '<td class="static-cell font-mono text-gray-400 text-[10px] border-r border-gray-100">' + s.lrn + '</td>' +
                subCols +
                '<td class="static-cell font-bold text-primary bg-blue-50/30 border-l-2 border-blue-200">' + displayGWA + '</td>' +
                '<td class="static-cell text-gray-600 cursor-pointer hover:bg-green-50 font-bold transition group" onclick="openAttendanceModal(\'' + s.lrn + '\')" title="Click to manage attendance">' +
                '<div class="flex items-center justify-center gap-1">' +
                '<span>' + (s.attendance > 0 ? s.attendance + '%' : '-') + '</span>' +
                '<i class="fas fa-edit text-[8px] opacity-0 group-hover:opacity-100 transition"></i>' +
                '</div>' +
                '</td>' +
                '<td class="static-cell">' + badge + '</td>' +
                '<td class="static-cell flex gap-2">' +
                '<button onclick="showReport(students.find(x => x.lrn === \'' + s.lrn + '\'))" class="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition border border-blue-100"><i class="fas fa-print"></i></button>' +
                '<button onclick="openAttendanceModal(\'' + s.lrn + '\')" class="px-2 py-1 bg-green-50 text-green-700 rounded-lg text-[10px] font-bold hover:bg-green-100 transition border border-green-100"><i class="fas fa-calendar-check"></i></button>' +
                '</td>' +
                '</tr>';
        }).join('');

    const isSHS = sec.toLowerCase().includes('grade 11') || sec.toLowerCase().includes('grade 12') || sec.toLowerCase().includes('gr 11') || sec.toLowerCase().includes('gr 12') || window.studentsAnalyticsLevel === 'SH';

    container.innerHTML = `
            <div class= "flex flex-col gap-4 animate-slide-up" style = "height: calc(100vh - 140px);">
            <div class="flex items-center gap-2 text-sm flex-wrap shrink-0">
                <button onclick="adviserSelectedSection = null; renderAdviserRecords(document.getElementById('content-area'));"
                    class="text-gray-400 hover:text-primary font-semibold transition">
                    <i class="fas fa-home mr-1"></i> My Sections
                </button>
                <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
                <span class="text-gray-700 font-bold">${sec}</span>
                <span class="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase">
                    <i class="fas fa-user-tie mr-1"></i>Adviser Full Access
                </span>
            </div>
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col flex-1">
                <div class="p-4 border-b bg-amber-50/50 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div>
                        <h3 class="font-bold text-gray-800 text-base">${sec} — Student Records</h3>
                        <p class="text-xs text-amber-600 font-semibold mt-0.5">
                            <i class="fas fa-edit mr-1"></i>Adviser view — all subjects visible. You may override grades.
                        </p>
                    </div>
                    <!-- Right side top bar -->
                    <div class="flex gap-2 items-center flex-wrap">
                        <select onchange="setRecordQuarter(this.value)" class="px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] outline-none focus:border-primary transition font-bold text-gray-700 bg-white shadow-sm h-[34px]">
                            <option value="ALL" ${window.currentRecordQuarter === 'ALL' || !window.currentRecordQuarter ? 'selected' : ''}>${isSHS ? 'All Terms' : 'All Quarters'}</option>
                            ${(function() {
                                let gpList = ['1', '2', '3', '4'];
                                if (typeof globalSettings !== 'undefined' && globalSettings['grading_periods']) {
                                    try {
                                        let parsed = JSON.parse(globalSettings['grading_periods']);
                                        if (Array.isArray(parsed) && parsed.length > 0) gpList = parsed;
                                    } catch(e){}
                                }
                                return gpList.map(gp => {
                                    let label = isSHS ? 'Term ' + gp : gp + (gp == 1 ? 'st' : gp == 2 ? 'nd' : gp == 3 ? 'rd' : 'th') + ' Quarter';
                                    return `<option value="${gp}" ${window.currentRecordQuarter == gp ? 'selected' : ''}>${label}</option>`;
                                }).join('');
                            })()}
                        </select>
                        ${!isSHS ? `
                        <div class="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 h-[34px]">
                            <button onclick="setRecordSemester(1)" class="px-3 py-1 rounded-md text-[10px] font-bold uppercase transition ${window.currentRecordSemester === 1 ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}">1st Sem</button>
                            <button onclick="setRecordSemester(2)" class="px-3 py-1 rounded-md text-[10px] font-bold uppercase transition ${window.currentRecordSemester === 2 ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}">2nd Sem</button>
                        </div>
                        ` : ''}
                        <div class="relative h-[34px]">
                            <i class="fas fa-search absolute left-3 top-2.5 text-gray-300 text-[10px]"></i>
                            <input type="text" value="${adviserSearch}"
                                oninput="adviserSearch = this.value; renderAdviserSectionStudents(document.getElementById('content-area'));"
                                placeholder="Search name or LRN…"
                                class="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-[10px] outline-none focus:border-primary transition w-44">
                        </div>
                        <button onclick="document.getElementById('qr-scan-modal').classList.remove('hidden')" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[10px] font-bold uppercase shadow-sm transition">
                            <i class="fas fa-qrcode mr-1"></i>Scan QR
                        </button>
                        <button onclick="openGradesModal(true)"
                            class="px-4 py-2 bg-primary text-white rounded-lg text-[10px] font-bold uppercase shadow-sm hover:bg-primaryDark transition">
                            <i class="fas fa-edit mr-1"></i>Override Grades
                        </button>
                    </div>
                </div>
                <div class="overflow-auto flex-1">
                    <table class="w-full excel-table border-collapse min-w-[600px]">
                        <thead>
                            <tr>
                                <th class="w-48 text-left static-cell">Full Name</th>
                                <th class="static-cell">LRN</th>
                                ${subjectHeaders}
                                <th class="bg-blue-50 text-blue-800 border-b-2 border-blue-200 static-cell">GWA</th>
                                <th class="static-cell">Att %</th>
                                <th class="static-cell">Status</th>
                                <th class="static-cell">Report</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        </div>
            `;
}



// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 1: Teacher List
// ─────────────────────────────────────────────────────────────────────────────
let adminTeacherSearch = '';

// Derive the sections a teacher handles from existing student grade data.
// A teacher handles a section when at least one student in that section
// has a grade entry for one of the teacher's subjects.
function getTeacherSections(t) {
    const subjects = (t.subject || '').split(',').map(s => s.trim()).filter(Boolean);
    if (subjects.length === 0) return [];
    const sections = new Set();
    students.forEach(s => {
        if (s.subjects && s.subjects.some(sub => subjects.includes(sub.n))) {
            sections.add(s.section);
        }
    });
    return [...sections].sort();
}

function renderAdminTeacherList(container) {
    const search = adminTeacherSearch.toLowerCase();
    let filtered = teachers.filter(t => {
        if (!search) return true;
        const derivedSections = getTeacherSections(t).join(' ').toLowerCase();
        return (
            t.name.toLowerCase().includes(search) ||
            (t.subject || '').toLowerCase().includes(search) ||
            derivedSections.includes(search)
        );
    });
    let levelBtnsHtml = '';
    
    if (currentUser.role === 'curriculum_coordinator') {
        if (currentUser.department === 'JHS') {
            filtered = filtered.filter(t => (t.level || 'JH') === 'JH');
        } else if (currentUser.department === 'SHS') {
            filtered = filtered.filter(t => (t.level || 'JH') === 'SH');
        }
    } else {
        // Apply JH/SH filter for non-coordinators
        if (adminLevelFilter !== 'ALL') {
            filtered = filtered.filter(t => (t.level || 'JH') === adminLevelFilter);
        }
        levelBtnsHtml = ['ALL', 'JH', 'SH'].map(l => {
            const labels = { ALL: 'All Levels', JH: 'Junior High', SH: 'Senior High' };
            const active = l === adminLevelFilter;
            return `<button onclick="setAdminLevelFilter('${l}')" class="px-3 py-1.5 rounded-full text-[10px] font-bold border transition ${active ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'}"> ${labels[l]}</button>`;
        }).join('');
    }

    container.innerHTML = `
            <div class="flex flex-col gap-6 animate-slide-up">
            <!--Tab row + header-->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">Grading Records</h2>
                    <p class="text-sm text-gray-400 mt-1">${adminRecordsTab === 'teachers' ? 'Select a teacher to view their sections and student records.' : 'View student analytics by level and grade.'}</p>
                </div>
                <div class="flex flex-col items-end gap-2 w-full md:w-auto">
                    <!-- Teachers / Students Tab -->
                    <div class="flex gap-1 bg-gray-100 rounded-2xl p-1">
                        <button onclick="switchRecordsTab('teachers')" class="px-5 py-2 rounded-xl text-sm font-bold transition ${adminRecordsTab === 'teachers' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-primary'}">
                            <i class="fas fa-chalkboard-teacher mr-1.5"></i>Teachers
                        </button>
                        <button onclick="switchRecordsTab('students')" class="px-5 py-2 rounded-xl text-sm font-bold transition ${adminRecordsTab === 'students' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-primary'}">
                            <i class="fas fa-users mr-1.5"></i>Students
                        </button>
                    </div>
                    <!-- Level filter pills (teachers tab only) -->
                    <div class="flex gap-2 flex-wrap">${levelBtnsHtml}</div>
                    <!-- Search bar (teachers tab only) -->
                    <div class="relative w-full md:w-72">
                        <i class="fas fa-search absolute left-3 top-3 text-gray-400 text-sm"></i>
                        <input
                            id="teacher-search-input"
                            type="text"
                            value="${adminTeacherSearch}"
                            oninput="adminTeacherSearch = this.value; renderAdminTeacherList(document.getElementById('content-area'));"
                            placeholder="Search teacher, subject, section…"
                            class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary shadow-sm transition"
                       >
                    </div>
                </div>
            </div>

            <!--Cards grid-->
            ${filtered.length === 0 ? `
                <div class="flex flex-col items-center justify-center py-24 text-gray-400">
                    <i class="fas fa-chalkboard-teacher text-5xl mb-4 opacity-30"></i>
                    <p class="font-semibold">No teachers found.</p>
                    <p class="text-xs mt-1">Try adjusting your search.</p>
                </div>
            ` : `
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${filtered.map(t => {
        const derivedSections = getTeacherSections(t);
        const subjectList = (t.subject || '').split(',').map(s => s.trim()).filter(Boolean);
        const initials = t.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const studentCount = students.filter(s => derivedSections.includes(s.section)).length;

        return `
                        <div
                            onclick="adminSelectedTeacher = teachers.find(x => x.id === '${t.id}'); adminSelectedSection = null; renderRecords(document.getElementById('content-area'));"
                            class="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary/40 cursor-pointer transition-all duration-200 group"
                       >
                            <div class="flex items-center gap-4 mb-4">
                                <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-green-800 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                    ${initials}
                                </div>
                                <div class="overflow-hidden">
                                    <h3 class="font-bold text-gray-900 truncate group-hover:text-primary transition-colors">${t.name}</h3>
                                    <div class="flex items-center gap-1 mt-0.5">
                                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${(t.level || 'JH') === 'SH' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}">${t.level || 'JH'}</span>
                                        ${t.strand ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">${t.strand}</span>` : ''}
                                    </div>
                                </div>
                            </div>

                            <div class="flex flex-col gap-2 mb-4">
                                <div class="flex flex-wrap gap-1">
                                    ${subjectList.length > 0
                ? subjectList.map(sub => `<span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase">${sub}</span>`).join('')
                : `<span class="text-[11px] text-gray-400 italic">No subjects assigned</span>`
            }
                                </div>
                                <div class="flex flex-wrap gap-1 mt-1">
                                    ${derivedSections.length > 0
                ? derivedSections.map(sec => `<span class="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-semibold">${sec}</span>`).join('')
                : `<span class="text-[11px] text-gray-400 italic">No grades recorded yet</span>`
            }
                                </div>
                            </div>

                            <div class="flex justify-between items-center pt-3 border-t border-gray-100">
                                <span class="text-[11px] text-gray-500"><i class="fas fa-users mr-1 text-gray-400"></i>${studentCount} student${studentCount !== 1 ? 's' : ''}</span>
                                <span class="text-[11px] text-primary font-bold group-hover:translate-x-1 transition-transform inline-block">
                                    View Sections <i class="fas fa-arrow-right ml-1"></i>
                                </span>
                            </div>
                        </div>
                        `;
    }).join('')}

                </div>
            `}
        </div>
            `;

    // Auto-focus search
    setTimeout(() => {
        const inp = document.getElementById('teacher-search-input');
        if (inp) inp.focus();
    }, 50);
}

function setAdminLevelFilter(level) {
    adminLevelFilter = level;
    renderAdminTeacherList(document.getElementById('content-area'));
}

function switchRecordsTab(tab) {
    adminRecordsTab = tab;
    adminSelectedTeacher = null;
    adminSelectedSection = null;
    if (tab === 'students') {
        renderAdminStudentsAnalytics(document.getElementById('content-area'));
    } else {
        renderAdminTeacherList(document.getElementById('content-area'));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENTS ANALYTICS VIEW
// ─────────────────────────────────────────────────────────────────────────────
function renderAdminStudentsAnalytics(container) {
    // ── Filter students based on level + grade/strand selection ──
    const jhGrades = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
    const shGrades = ['Grade 11', 'Grade 12'];

    // Detect which grade a student belongs to from their section name
    function guessGradeFromSection(sec) {
        const s = (sec || '').toLowerCase();
        if (s.match(/\b12\b/) || s.startsWith('12')) return 'Grade 12';
        if (s.match(/\b11\b/) || s.startsWith('11')) return 'Grade 11';
        if (s.match(/\b10\b/) || s.startsWith('10')) return 'Grade 10';
        if (s.match(/\b9\b/) || s.startsWith('9-')) return 'Grade 9';
        if (s.match(/\b8\b/) || s.startsWith('8-')) return 'Grade 8';
        if (s.match(/\b7\b/) || s.startsWith('7-')) return 'Grade 7';
        
        if (typeof teachers !== 'undefined') {
            const adv = teachers.find(t => t.is_adviser && (t.section || '').split(',').map(x => x.trim().toLowerCase()).includes(s));
            if (adv) {
                if (adv.level === 'SH') return 'Grade 11';
                if (adv.level === 'JH') return 'Grade 7';
            }
        }
        
        return null;
    }

    function getFilteredStudents() {
        let pool = students.filter(s => s.section); // must be assigned to a section
        if (studentsAnalyticsLevel === 'JH') {
            pool = pool.filter(s => {
                const g = guessGradeFromSection(s.section);
                return jhGrades.includes(g);
            });
            if (studentsAnalyticsGrade !== 'all') {
                pool = pool.filter(s => guessGradeFromSection(s.section) === studentsAnalyticsGrade);
            }
        } else if (studentsAnalyticsLevel === 'SH') {
            pool = pool.filter(s => {
                const g = guessGradeFromSection(s.section);
                return shGrades.includes(g);
            });
            if (studentsAnalyticsGrade !== 'all') {
                pool = pool.filter(s => guessGradeFromSection(s.section) === studentsAnalyticsGrade);
            }
        }
        return pool;
    }

    const filtered = getFilteredStudents();
    const withGrades = filtered.filter(s => s.gwa > 0);
    const avgGwa = withGrades.length ? (withGrades.reduce((sum, s) => sum + s.gwa, 0) / withGrades.length).toFixed(2) : '--';
    const honors = withGrades.filter(s => {
        const hasFailing = s.grades && Object.values(s.grades).some(g => parseFloat(g) < 75);
        return s.gwa >= 90 && !hasFailing;
    }).length;
    const passing = withGrades.filter(s => s.gwa >= 75 && s.gwa < 90).length;
    const atRisk = withGrades.filter(s => s.gwa > 0 && s.gwa < 75).length;

    // ── Build grade/strand sub-filter pills ──
    let subFilterHtml = '';
    if (studentsAnalyticsLevel === 'JH') {
        subFilterHtml = '<div class="flex flex-wrap gap-2">' +
            [{ v: 'all', l: 'All JH' }, ...jhGrades.map(g => ({ v: g, l: g }))].map(opt => {
                const active = studentsAnalyticsGrade === opt.v;
                return '<button onclick="setStudentsGradeFilter(\'' + opt.v + '\')" class="px-3 py-1.5 rounded-full text-xs font-bold border transition ' +
                    (active ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary') + '">' + opt.l + '</button>';
            }).join('') +
            '</div>';
    } else if (studentsAnalyticsLevel === 'SH') {
        subFilterHtml = '<div class="flex flex-wrap gap-2">' +
            [{ v: 'all', l: 'All SH' }, ...shGrades.map(g => ({ v: g, l: g }))].map(opt => {
                const active = studentsAnalyticsGrade === opt.v;
                return '<button onclick="setStudentsGradeFilter(\'' + opt.v + '\')" class="px-3 py-1.5 rounded-full text-xs font-bold border transition ' +
                    (active ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary') + '">' + opt.l + '</button>';
            }).join('') +
            '</div>';
    }

    // ── Section breakdown (for chart) ──
    const sectionMap = {};
    filtered.forEach(s => {
        if (!s.section) return;
        if (!sectionMap[s.section]) sectionMap[s.section] = { total: 0, withGwa: 0, gwaSum: 0, honor: 0, atRisk: 0 };
        sectionMap[s.section].total++;
        if (s.gwa > 0) {
            sectionMap[s.section].withGwa++;
            sectionMap[s.section].gwaSum += s.gwa;
            const hasFailing = s.grades && Object.values(s.grades).some(g => parseFloat(g) < 75);
            if (s.gwa >= 90 && !hasFailing) sectionMap[s.section].honor++;
            if (s.gwa < 75) sectionMap[s.section].atRisk++;
        }
    });
    const secLabels = Object.keys(sectionMap).sort();
    const secAvgGwa = secLabels.map(sec => sectionMap[sec].withGwa ? (sectionMap[sec].gwaSum / sectionMap[sec].withGwa).toFixed(1) : 0);
    const secHonors = secLabels.map(sec => sectionMap[sec].honor);
    const secAtRisk = secLabels.map(sec => sectionMap[sec].atRisk);

    // ── Student list (alphabetical order) ──
    const listStudents = [...withGrades].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 10);

    const studentListHtml = listStudents.length === 0
        ? '<p class="text-gray-400 italic text-sm text-center py-6">No graded students in this selection.</p>'
        : listStudents.map((s, i) => {
            const hasFailing = s.grades && Object.values(s.grades).some(g => parseFloat(g) < 75);
            const isStudentHonors = s.gwa >= 90 && !hasFailing;
            const badge = isStudentHonors ? '<span class="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[9px] font-bold">With Honors</span>'
                : s.gwa < 75 ? '<span class="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[9px] font-bold">At Risk</span>' : '';
            const gwaColor = s.gwa >= 90 ? 'text-yellow-600' : s.gwa < 75 ? 'text-red-500' : 'text-green-600';
            return '<div class="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-b-0">' +
                '<span class="text-[10px] font-bold text-gray-300 w-5 text-right shrink-0">' + (i + 1) + '</span>' +
                '<div class="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-green-800 flex items-center justify-center text-white text-[10px] font-bold shrink-0">' +
                s.name.split(',')[0].trim().charAt(0) + (s.name.split(' ').pop().charAt(0) || '') +
                '</div>' +
                '<div class="flex-1 min-w-0">' +
                '<p class="text-sm font-bold text-gray-800 truncate">' + s.name + '</p>' +
                '<p class="text-[10px] text-gray-400">' + (s.section || '—') + ' ' + badge + '</p>' +
                '</div>' +
                '<span class="text-sm font-bold ' + gwaColor + ' shrink-0">' + s.gwa.toFixed(1) + '</span>' +
                '</div>';
        }).join('');

    const levelBtns2 = [
        { v: 'ALL', l: 'All Students' },
        { v: 'JH', l: 'Junior High' },
        { v: 'SH', l: 'Senior High' },
    ].map(opt => {
        const active = studentsAnalyticsLevel === opt.v;
        return '<button onclick="setStudentsLevelFilter(\'' + opt.v + '\')" class="px-4 py-2 rounded-xl text-sm font-bold border-2 transition ' +
            (active ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary') + '">' + opt.l + '</button>';
    }).join('');

    const tabBtns = `
            <div class="flex gap-1 bg-gray-100 rounded-2xl p-1">
            <button onclick="switchRecordsTab('teachers')" class="px-5 py-2 rounded-xl text-sm font-bold transition text-gray-500 hover:text-primary">
                <i class="fas fa-chalkboard-teacher mr-1.5"></i>Teachers
            </button>
            <button onclick="switchRecordsTab('students')" class="px-5 py-2 rounded-xl text-sm font-bold transition bg-white text-primary shadow-sm">
                <i class="fas fa-users mr-1.5"></i>Students
            </button>
        </div> `;

    container.innerHTML = `
            <div class="flex flex-col gap-6 animate-slide-up">
            <!--Header + tabs-->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">Students Analytics</h2>
                    <p class="text-sm text-gray-400 mt-1">View student performance across levels and grade groups.</p>
                </div>
                <div class="flex flex-col items-end gap-3">
                    ${tabBtns}
                    <!-- Level toggle -->
                    <div class="flex gap-2 flex-wrap">${levelBtns2}</div>
                    <!-- Grade/strand sub-filter -->
                    ${subFilterHtml}
                </div>
            </div>

            <!--Summary stat cards-->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Students</p>
                    <p class="text-3xl font-black text-gray-800 mt-1">${filtered.length}</p>
                    <p class="text-[10px] text-gray-400 mt-1">${withGrades.length} with grades</p>
                </div>
                <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Average GWA</p>
                    <p class="text-3xl font-black ${parseFloat(avgGwa) >= 90 ? 'text-yellow-500' : parseFloat(avgGwa) >= 75 ? 'text-green-600' : 'text-red-500'} mt-1">${avgGwa}</p>
                    <p class="text-[10px] text-gray-400 mt-1">across graded students</p>
                </div>
                <div class="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-5 border border-yellow-100 shadow-sm">
                    <p class="text-[10px] font-bold text-yellow-600 uppercase tracking-wider">With Honors</p>
                    <p class="text-3xl font-black text-yellow-600 mt-1">${honors}</p>
                    <p class="text-[10px] text-yellow-500 mt-1">GWA ≥ 90</p>
                </div>
                <div class="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-5 border border-red-100 shadow-sm">
                    <p class="text-[10px] font-bold text-red-400 uppercase tracking-wider">At Risk</p>
                    <p class="text-3xl font-black text-red-500 mt-1">${atRisk}</p>
                    <p class="text-[10px] text-red-400 mt-1">GWA &lt; 75</p>
                </div>
            </div>

            <!--Charts row-->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <!-- Bar chart: Avg GWA per section -->
                <div class="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <p class="text-sm font-bold text-gray-700 mb-4"><i class="fas fa-chart-bar mr-2 text-primary"></i>Average GWA by Section</p>
                    <div class="relative h-52">
                        <canvas id="chart-gwa-by-section"></canvas>
                    </div>
                </div>
                <!-- Pie chart: Performance distribution -->
                <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <p class="text-sm font-bold text-gray-700 mb-4"><i class="fas fa-chart-pie mr-2 text-primary"></i>Performance Distribution</p>
                    <div class="relative h-52">
                        <canvas id="chart-performance-dist"></canvas>
                    </div>
                    <div class="flex flex-wrap gap-3 justify-center mt-3 text-[10px] font-bold">
                        <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span> Honors (≥90): ${honors}</span>
                        <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Passing: ${passing}</span>
                        <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-red-500 inline-block"></span> At Risk: ${atRisk}</span>
                    </div>
                </div>
            </div>

            <!--Section detail + Student leaderboard-->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <!-- Honors/At-risk per section bar -->
                <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <p class="text-sm font-bold text-gray-700 mb-4"><i class="fas fa-layer-group mr-2 text-primary"></i>Honors & At-Risk by Section</p>
                    <div class="relative h-52">
                        <canvas id="chart-honor-risk-by-section"></canvas>
                    </div>
                </div>
                <!-- Top performers -->
                <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm overflow-y-auto max-h-80">
                    <p class="text-sm font-bold text-gray-700 mb-3"><i class="fas fa-trophy mr-2 text-yellow-500"></i>Top Performers (GWA)</p>
                    ${studentListHtml}
                </div>
            </div>

            <!-- New Section: Full Grading Table -->
            <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mt-4">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div>
                        <h3 class="text-lg font-bold text-gray-800"><i class="fas fa-table mr-2 text-primary"></i>Master Grading Table</h3>
                        <p class="text-xs text-gray-400 mt-1">Select a section to view all student grades in detail.</p>
                    </div>
                    <div class="w-full md:w-64">
                        <select onchange="window.studentsAnalyticsSelectedSection = this.value; renderAdminStudentsAnalytics(document.getElementById('content-area'));" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold outline-none focus:border-primary transition">
                            <option value="">-- Select Section --</option>
                            ${secLabels.map(sec => `<option value="${sec}" ${window.studentsAnalyticsSelectedSection === sec ? 'selected' : ''}>${sec}</option>`).join('')}
                        </select>
                    </div>
                </div>
                
                <div id="analytics-grading-table-container" class="overflow-x-auto w-full rounded-xl border border-gray-100 bg-gray-50/50">
                    <!-- Table will be rendered here if a section is selected -->
                </div>
            </div>
        </div>
            `;

    // ── Render charts with Chart.js ──
    setTimeout(() => {
        // Chart 1: Avg GWA by section (horizontal bar)
        const ctx1 = document.getElementById('chart-gwa-by-section');
        if (ctx1) {
            if (ctx1._chart) ctx1._chart.destroy();
            ctx1._chart = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: secLabels.length ? secLabels : ['No data'],
                    datasets: [{
                        label: 'Avg GWA',
                        data: secLabels.length ? secAvgGwa : [0],
                        backgroundColor: secAvgGwa.map(v => parseFloat(v) >= 90 ? 'rgba(234,179,8,0.75)' : parseFloat(v) >= 75 ? 'rgba(34,197,94,0.75)' : 'rgba(239,68,68,0.75)'),
                        borderRadius: 6,
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { min: 60, max: 100, ticks: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                        x: { ticks: { font: { size: 10 } }, grid: { display: false } }
                    }
                }
            });
        }

        // Chart 2: Pie – performance distribution
        const ctx2 = document.getElementById('chart-performance-dist');
        if (ctx2) {
            if (ctx2._chart) ctx2._chart.destroy();
            ctx2._chart = new Chart(ctx2, {
                type: 'doughnut',
                data: {
                    labels: ['With Honors (≥90)', 'Passing (75-89)', 'At Risk (<75)', 'No Grades'],
                    datasets: [{
                        data: [honors, passing, atRisk, filtered.length - withGrades.length],
                        backgroundColor: ['rgba(234,179,8,0.85)', 'rgba(34,197,94,0.85)', 'rgba(239,68,68,0.85)', 'rgba(156,163,175,0.5)'],
                        borderWidth: 2, borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    cutout: '60%'
                }
            });
        }

        // Chart 3: Grouped bar – honors vs at-risk per section
        const ctx3 = document.getElementById('chart-honor-risk-by-section');
        if (ctx3) {
            if (ctx3._chart) ctx3._chart.destroy();
            ctx3._chart = new Chart(ctx3, {
                type: 'bar',
                data: {
                    labels: secLabels.length ? secLabels : ['No data'],
                    datasets: [
                        { label: 'With Honors', data: secLabels.length ? secHonors : [0], backgroundColor: 'rgba(234,179,8,0.75)', borderRadius: 5 },
                        { label: 'At Risk', data: secLabels.length ? secAtRisk : [0], backgroundColor: 'rgba(239,68,68,0.75)', borderRadius: 5 }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'top', labels: { font: { size: 10 }, boxWidth: 12 } } },
                    scales: {
                        y: { ticks: { font: { size: 10 }, stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.04)' } },
                        x: { ticks: { font: { size: 10 } }, grid: { display: false } }
                    }
                }
            });
        }
        
        // Render Master Grading Table if a section is selected
        const tableContainer = document.getElementById('analytics-grading-table-container');
        if (tableContainer) {
            if (window.studentsAnalyticsSelectedSection) {
                const secStr = window.studentsAnalyticsSelectedSection;
                let secStudents = students.filter(s => s.section === secStr);
                const subjectHeaders = coreSubjects.map(sub => '<th class="static-cell text-gray-600">' + sub + '</th>').join('');
                
                const rows = secStudents.length === 0
                    ? '<tr><td colspan="30" class="py-12 text-center text-gray-400 italic">No students found.</td></tr>'
                    : secStudents.map(s => {
                        const subCols = coreSubjects.map(subName => {
                            const subData = s.subjects && s.subjects.find(x => x.n === subName);
                            let grade = subData && subData.g !== null && subData.g !== undefined ? subData.g : '-';
                            const color = (grade !== '-' && grade < 75) ? 'text-red-500 font-bold' : 'text-gray-700';
                            return '<td class="static-cell ' + color + '">' + grade + '</td>';
                        }).join('');

                        let displayGWA = s.gwa > 0 ? s.gwa : '-';
                        let badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500">No Grades</span>';
                        const gwaVal = parseFloat(displayGWA);
                        if (!isNaN(gwaVal)) {
                            const isSH = window.currentRecordGradeLevel >= 11;
                            const hasFailing = s.grades && Object.values(s.grades).some(g => parseFloat(g) < 75);
                            if (isSH) {
                                if (gwaVal >= 90 && !hasFailing) {
                                    badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-700 font-bold">Academic Excellence Award</span>';
                                } else if (gwaVal >= 75) {
                                    badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-green-100 text-green-600 font-bold">Regular</span>';
                                } else if (gwaVal > 0) {
                                    badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-600 font-bold">Failing</span>';
                                }
                            } else {
                                if (gwaVal >= 98 && !hasFailing) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-700 font-bold">Highest Honor</span>';
                                else if (gwaVal >= 95 && !hasFailing) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 font-bold">High Honor</span>';
                                else if (gwaVal >= 90 && !hasFailing) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-bold">With Honor</span>';
                                else if (gwaVal >= 75) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-green-100 text-green-600 font-bold">Regular</span>';
                                else if (gwaVal > 0) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-600 font-bold">Failing</span>';
                            }
                        }

                        return '<tr class="hover:bg-blue-50/30 transition border-b border-gray-50">' +
                            '<td class="student-name border-r border-gray-100 font-semibold text-gray-800">' + s.name + '</td>' +
                            '<td class="static-cell font-mono text-gray-400 text-[10px] border-r border-gray-100">' + s.lrn + '</td>' +
                            subCols +
                            '<td class="static-cell font-bold text-primary bg-blue-50/30 border-l-2 border-blue-200">' + displayGWA + '</td>' +
                            '<td class="static-cell">' + (s.attendance > 0 ? s.attendance + '%' : '-') + '</td>' +
                            '<td class="static-cell">' + badge + '</td>' +
                            '<td class="static-cell flex gap-2">' +
                            `<button onclick="if(typeof showReport === 'function'){showReport(students.find(x => x.lrn === '${s.lrn}'))}" class="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition border border-blue-100"><i class="fas fa-print"></i></button>` +
                            '</td>' +
                            '</tr>';
                    }).join('');
                
                tableContainer.innerHTML = `<table class="w-full excel-table border-collapse min-w-[600px]">
                        <thead>
                            <tr>
                                <th class="w-48 text-left static-cell">Full Name</th>
                                <th class="static-cell">LRN</th>
                                ${subjectHeaders}
                                <th class="bg-blue-50 text-blue-800 border-b-2 border-blue-200 static-cell">GWA</th>
                                <th class="static-cell">Att %</th>
                                <th class="static-cell">Status</th>
                                <th class="static-cell">Report</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>`;
            } else {
                tableContainer.innerHTML = '<div class="py-12 text-center text-gray-400 italic">Please select a section from the dropdown above to view the detailed grading table.</div>';
            }
        }
    }, 100);
}

function setStudentsLevelFilter(level) {
    studentsAnalyticsLevel = level;
    studentsAnalyticsGrade = 'all';
    renderAdminStudentsAnalytics(document.getElementById('content-area'));
}

function setStudentsGradeFilter(grade) {
    studentsAnalyticsGrade = grade;
    renderAdminStudentsAnalytics(document.getElementById('content-area'));
}



// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 2: Teacher's Sections
// ─────────────────────────────────────────────────────────────────────────────
function renderAdminTeacherSections(container) {
    const t = adminSelectedTeacher;
    if (!t) { renderAdminTeacherList(container); return; }

    // Derive sections from actual student grade data
    const sectionList = getTeacherSections(t);
    const initials = t.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    container.innerHTML = `
            <div class="flex flex-col gap-6 animate-slide-up">
            <!--Breadcrumb -->
            <div class="flex items-center gap-2 text-sm flex-wrap">
                <button onclick="adminSelectedTeacher = null; adminSelectedSection = null; renderRecords(document.getElementById('content-area'));"
                    class="text-gray-400 hover:text-primary font-semibold transition">
                    <i class="fas fa-home mr-1"></i> All Teachers
                </button>
                <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
                <span class="text-gray-700 font-bold">${t.name}</span>
            </div>

            <!--Teacher info card-->
            <div class="bg-gradient-to-r from-primary to-green-800 rounded-2xl p-6 text-white shadow-md">
                <div class="flex items-center gap-5">
                    <div class="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-2xl shadow-inner">
                        ${initials}
                    </div>
                    <div>
                        <h2 class="text-xl font-bold">${t.name}</h2>
                        <p class="text-green-200 text-sm mt-0.5">${(t.subject || 'No subjects assigned')}</p>
                        <p class="text-[11px] text-green-300 mt-1 uppercase tracking-wide font-semibold">${sectionList.length} Section${sectionList.length !== 1 ? 's' : ''} Handled</p>
                    </div>
                </div>
            </div>

            <!--Section heading-->
            <div>
                <h3 class="font-bold text-gray-700 text-base uppercase tracking-widest text-[11px] mb-3">
                    <i class="fas fa-layer-group text-primary mr-2"></i>Sections
                </h3>

                ${sectionList.length === 0 ? `
                    <div class="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100">
                        <i class="fas fa-folder-open text-4xl mb-3 opacity-30"></i>
                        <p class="font-semibold">No student grades recorded for this teacher yet.</p>
                        <p class="text-xs mt-2">Sections will appear here once a student has grades for <strong>${t.subject || 'their subjects'}</strong>.</p>
                    </div>
                ` : `
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${sectionList.map(sec => {
        const secStudents = students.filter(s => s.section === sec);
        const subjectList = (t.subject || '').split(',').map(s => s.trim()).filter(Boolean);
        const evaluated = secStudents.filter(s =>
            s.subjects && s.subjects.some(sub => subjectList.includes(sub.n) && sub.g !== null && sub.g !== undefined)
        ).length;
        const atRisk = secStudents.filter(s => s.gwa > 0 && s.gwa < 75).length;

        return `
                            <div
                                onclick="adminSelectedSection = '${sec}'; renderRecords(document.getElementById('content-area'));"
                                class="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary/40 cursor-pointer transition-all duration-200 group"
                           >
                                <div class="flex items-center justify-between mb-4">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-primary">
                                            <i class="fas fa-chalkboard text-base"></i>
                                        </div>
                                        <div>
                                            <h4 class="font-bold text-gray-900 group-hover:text-primary transition-colors">${sec}</h4>
                                            <p class="text-[11px] text-gray-400">${secStudents.length} student${secStudents.length !== 1 ? 's' : ''}</p>
                                        </div>
                                    </div>
                                    <i class="fas fa-chevron-right text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all"></i>
                                </div>
                                <div class="grid grid-cols-3 gap-2 bg-gray-50 rounded-xl p-3">
                                    <div class="text-center">
                                        <p class="text-lg font-bold text-gray-800">${secStudents.length}</p>
                                        <p class="text-[10px] text-gray-400 uppercase">Total</p>
                                    </div>
                                    <div class="text-center border-x border-gray-200">
                                        <p class="text-lg font-bold text-blue-600">${evaluated}</p>
                                        <p class="text-[10px] text-gray-400 uppercase">Evaluated</p>
                                    </div>
                                    <div class="text-center">
                                        <p class="text-lg font-bold ${atRisk > 0 ? 'text-red-500' : 'text-gray-400'}">${atRisk}</p>
                                        <p class="text-[10px] text-gray-400 uppercase">At Risk</p>
                                    </div>
                                </div>
                            </div>
                            `;
    }).join('')}
                    </div>
                `}
            </div>
        </div>
            `;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 3: Students in a Section
// ─────────────────────────────────────────────────────────────────────────────
let adminSectionSearch = '';

function renderAdminSectionStudents(container) {
    const t = adminSelectedTeacher;
    const sec = adminSelectedSection;
    if (!t || !sec) { renderAdminTeacherList(container); return; }

    const subjectList = (t.subject || '').split(',').map(s => s.trim()).filter(Boolean);
    const visibleSubjects = subjectList.length > 0 ? subjectList : coreSubjects;

    const search = adminSectionSearch.toLowerCase();
    let secStudents = students.filter(s => s.section === sec);
    if (search) {
        secStudents = secStudents.filter(s =>
            s.name.toLowerCase().includes(search) ||
            s.lrn.includes(search)
        );
    }

    const isSHS = sec.toLowerCase().includes('grade 11') || sec.toLowerCase().includes('grade 12') || sec.toLowerCase().includes('gr 11') || sec.toLowerCase().includes('gr 12') || window.studentsAnalyticsLevel === 'SH';

    container.innerHTML = `
            <div class="flex flex-col gap-4 animate-slide-up" style = "height: calc(100vh - 140px);">

            <!--Breadcrumb -->
            <div class="flex items-center gap-2 text-sm flex-wrap shrink-0">
                <button onclick="adminSelectedTeacher = null; adminSelectedSection = null; renderRecords(document.getElementById('content-area'));"
                    class="text-gray-400 hover:text-primary font-semibold transition">
                    <i class="fas fa-home mr-1"></i> All Teachers
                </button>
                <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
                <button onclick="adminSelectedSection = null; renderRecords(document.getElementById('content-area'));"
                    class="text-gray-400 hover:text-primary font-semibold transition">${t.name}</button>
                <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
                <span class="text-gray-700 font-bold">${sec}</span>
            </div>

            <!--Table card-->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col flex-1">
                <!-- Top bar -->
                <div class="p-4 border-b bg-gray-50/50 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div>
                        <h3 class="font-bold text-gray-800 text-base">${sec} — Student Records</h3>
                        <p class="text-xs text-gray-400 mt-0.5">Teacher: <span class="font-semibold text-gray-600">${t.name}</span></p>
                    </div>
                    <div class="flex gap-2 items-center flex-wrap">
                        <select onchange="setRecordQuarter(this.value)" class="px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] outline-none focus:border-primary transition font-bold text-gray-700 bg-white shadow-sm h-[34px]">
                            <option value="ALL" ${window.currentRecordQuarter === 'ALL' || !window.currentRecordQuarter ? 'selected' : ''}>${isSHS ? 'All Terms' : 'All Quarters'}</option>
                            ${(function() {
                                let gpList = ['1', '2', '3', '4'];
                                if (typeof globalSettings !== 'undefined' && globalSettings['grading_periods']) {
                                    try {
                                        let parsed = JSON.parse(globalSettings['grading_periods']);
                                        if (Array.isArray(parsed) && parsed.length > 0) gpList = parsed;
                                    } catch(e){}
                                }
                                return gpList.map(gp => {
                                    let label = isSHS ? 'Term ' + gp : gp + (gp == 1 ? 'st' : gp == 2 ? 'nd' : gp == 3 ? 'rd' : 'th') + ' Quarter';
                                    return `<option value="${gp}" ${window.currentRecordQuarter == gp ? 'selected' : ''}>${label}</option>`;
                                }).join('');
                            })()}
                        </select>
                        <div class="relative h-[34px]">
                            <i class="fas fa-search absolute left-3 top-2.5 text-gray-300 text-[10px]"></i>
                            <input
                                type="text"
                                id="section-student-search"
                                value="${adminSectionSearch}"
                                oninput="adminSectionSearch = this.value; renderAdminSectionStudents(document.getElementById('content-area'));"
                                placeholder="Search name or LRN…"
                                class="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-[10px] outline-none focus:border-primary transition w-44"
                           >
                        </div>
                        <button onclick="document.getElementById('qr-scan-modal').classList.remove('hidden')" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[10px] font-bold uppercase shadow-sm transition">
                            <i class="fas fa-qrcode mr-1"></i>Scan QR
                        </button>
                        <button onclick="printReport('${sec} - Student Records')"
                                class="px-4 py-2 bg-purple-500 text-white rounded-lg text-[10px] font-bold uppercase shadow-sm hover:bg-purple-600 transition">
                            <i class="fas fa-print mr-1"></i>Print Report
                        </button>
                        <button onclick="openGradesModal()"
                            class="px-4 py-2 bg-primary text-white rounded-lg text-[10px] font-bold uppercase shadow-sm hover:bg-primaryDark transition">
                            <i class="fas fa-edit mr-1"></i>Override Grades
                        </button>
                    </div>
                </div>

                <!-- Students table -->
                <div class="overflow-auto flex-1">
                    <table class="w-full excel-table border-collapse min-w-[600px]">
                        <thead>
                            <tr>
                                <th class="w-48 text-left static-cell">Full Name</th>
                                <th class="static-cell">LRN</th>
                                ${visibleSubjects.map(sub => `
                                    <th class="cursor-pointer hover:bg-green-100 group transition text-primary static-cell"
                                        onclick="currentSubjectView = '${sub}'; renderDetailedSubjectView(document.getElementById('content-area'), '${sub}');"
                                        title="Open E-Class Record for ${sub}">
                                        <div class="flex items-center justify-center gap-1">
                                            <span class="group-hover:underline">${sub}</span>
                                            <i class="fas fa-external-link-alt text-[8px] opacity-50 group-hover:opacity-100"></i>
                                        </div>
                                    </th>
                                `).join('')}
                                <th class="bg-blue-50 text-blue-800 border-b-2 border-blue-200 static-cell">GWA</th>
                                <th class="static-cell">Att %</th>
                                <th class="static-cell">Status</th>
                                <th class="static-cell">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${secStudents.length === 0
            ? `<tr><td colspan="30" class="py-12 text-center text-gray-400 italic">No students found.</td></tr>`
            : secStudents.map(s => {
                const subCols = visibleSubjects.map(subName => {
                    const subData = s.subjects.find(x => x.n === subName);
                    const grade = subData && subData.g !== null && subData.g !== undefined ? subData.g : '-';
                    const color = (grade !== '-' && grade < 75) ? 'text-red-500 font-bold' : 'text-gray-700';
                    return `<td class="static-cell ${color}">${grade}</td>`;
                }).join('');

                let badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500">No Grades</span>';
                const isSH = window.currentRecordGradeLevel >= 11;
                const hasFailing = s.grades && Object.values(s.grades).some(g => parseFloat(g) < 75);
                
                if (isSH) {
                    if (s.gwa >= 90 && !hasFailing) {
                        badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-700 font-bold">Academic Excellence Award</span>';
                    } else if (s.gwa >= 75) {
                        badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-green-100 text-green-600 font-bold">Regular</span>';
                    } else if (s.gwa > 0) {
                        badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-600 font-bold">Failing</span>';
                    }
                } else {
                    if (s.gwa >= 98 && !hasFailing) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-700 font-bold">Highest Honor</span>';
                    else if (s.gwa >= 95 && !hasFailing) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 font-bold">High Honor</span>';
                    else if (s.gwa >= 90 && !hasFailing) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-bold">With Honor</span>';
                    else if (s.gwa >= 75) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-green-100 text-green-600 font-bold">Regular</span>';
                    else if (s.gwa > 0) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-600 font-bold">Failing</span>';
                }

                return `
                                    <tr class="hover:bg-blue-50/30 transition border-b border-gray-50">
                                        <td class="student-name border-r border-gray-100 font-semibold text-gray-800">${s.name}</td>
                                        <td class="static-cell font-mono text-gray-400 text-[10px] border-r border-gray-100">${s.lrn}</td>
                                        ${subCols}
                                        <td class="static-cell font-bold text-primary bg-blue-50/30 border-l-2 border-blue-200">${s.gwa > 0 ? s.gwa : '-'}</td>
                                        <td class="static-cell text-gray-600 cursor-pointer hover:bg-green-50 font-bold transition group" 
                                            onclick="openAttendanceModal('${s.lrn}')" title="Click to manage attendance">
                                            <div class="flex items-center justify-center gap-1">
                                                <span>${s.attendance > 0 ? s.attendance + '%' : '-'}</span>
                                                <i class="fas fa-edit text-[8px] opacity-0 group-hover:opacity-100 transition"></i>
                                            </div>
                                        </td>
                                        <td class="static-cell">${badge}</td>
                                        <td class="static-cell space-x-1">
                                            <button onclick="showReport(students.find(x => x.lrn === '${s.lrn}'))"
                                                class="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition border border-blue-100" title="Report Card">
                                                <i class="fas fa-print"></i>
                                            </button>
                                            <button onclick="openAttendanceModal('${s.lrn}')"
                                                class="px-2 py-1 bg-green-50 text-green-600 rounded-lg text-[10px] font-bold hover:bg-green-100 transition border border-green-100" title="Manage Attendance">
                                                <i class="fas fa-calendar-check text-[10px]"></i>
                                            </button>
                                        </td>
                                    </tr>
                                    `;
            }).join('')
        }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
            `;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEACHER ROLE: Master Records View (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
let pinnedSections = [];

function loadPinnedSections() {
    if (!currentUser || !currentUser.id) return;
    const key = `pinned_sections_${currentUser.id} `;
    const saved = localStorage.getItem(key);
    if (saved) {
        try { pinnedSections = JSON.parse(saved); } catch { pinnedSections = []; }
    } else {
        pinnedSections = [];
    }
}

function savePinnedSections() {
    if (!currentUser || !currentUser.id) return;
    const key = `pinned_sections_${currentUser.id} `;
    localStorage.setItem(key, JSON.stringify(pinnedSections));
}

function renderMasterRecordsView(container) {
    loadPinnedSections();
    let teacherStudents = students;
    if (currentUser.role === 'teacher' && currentUser.handledSections && currentUser.handledSections.length > 0) {
        teacherStudents = students.filter(s => currentUser.handledSections.includes(s.section));
    }

    const rawSec = localStorage.getItem('cnhs_sections');
    const sectionsData = rawSec ? JSON.parse(rawSec) : [];
    const _getLabel = (name) => {
        const sObj = sectionsData.find(x => x.name === name);
        if (!sObj || !sObj.year) return name;
        const gNum = sObj.year.replace(/\D/g, '');
        return gNum ? `${gNum} - ${name}` : name;
    };
    const yearSections = sectionsData.filter(s => !s.schoolYear || s.schoolYear === (window.currentRecordSchoolYear || '2025-2026')).map(s => s.name);

    const visiblePinnedSections = pinnedSections.filter(sec => yearSections.includes(sec) || sec === 'all');
    const unpinned = yearSections.filter(s => !visiblePinnedSections.includes(s));
    const teacherSubjects = currentUser.subject ? currentUser.subject.split(',').map(s => s.trim()) : [];
    const visibleSubjects = currentUser.role === 'teacher' ? teacherSubjects : coreSubjects;

    if (currentRecordSection === 'all' && currentUser.role === 'teacher') {
        currentRecordSection = visiblePinnedSections.length > 0 ? visiblePinnedSections[0] : (yearSections.length > 0 ? yearSections[0] : null);
    }

    const sectionBtnsHtml = visiblePinnedSections.map(sec => {
        if (sec === 'all') return ''; // Handled separately
        return `
            <div class="inline-flex items-center rounded-full border text-[10px] font-bold overflow-hidden shadow-sm transition-all
                    ${currentRecordSection === sec
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary'
            } ">
            <button onclick = "setPinnedSection('${sec}')" class="pl-3 pr-2 py-1.5 tracking-wide"> ${_getLabel(sec)}</button>
                <button onclick="removePinnedSection('${sec}')" title="Remove section"
                    class="pr-2 py-1.5 opacity-60 hover:opacity-100 hover:text-red-400 transition"
                    style="${currentRecordSection === sec ? 'color:rgba(255,255,255,0.8)' : ''}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            `;
    }).join('');

    container.innerHTML = `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-slide-up flex flex-col" style="height: calc(100vh - 140px);">
            <div class="p-4 border-b bg-gray-50/50 shrink-0 flex flex-col gap-3">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div>
                        <h3 class="font-bold text-gray-800 text-lg">Master Academic Records</h3>
                        <p class="text-xs text-gray-400">Click any subject column or "Input Grades" cell to open its detailed class record spreadsheet.</p>
                    </div>
                    <div class="flex flex-wrap gap-2 items-center">
                        <div class="relative">
                            <i class="fas fa-search absolute left-3 top-2.5 text-gray-300 text-[10px]"></i>
                            <input type="text" value="${currentRecordSearch}"
                                   onkeyup="searchRecordsTable(this.value)"
                                   placeholder="Search Name/LRN..."
                                   class="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-[10px] outline-none focus:border-primary transition w-44">
                        </div>
                        <button onclick="document.getElementById('qr-scan-modal').classList.remove('hidden')" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[10px] font-bold uppercase shadow-sm transition">
                            <i class="fas fa-qrcode mr-1"></i>Scan QR
                        </button>
                        <div id="save-status" class="hidden flex items-center gap-2 px-3 py-1.5 bg-green-50 text-primary border border-green-100 rounded-lg animate-pulse">
                            <i class="fas fa-check-circle text-[10px]"></i>
                            <span class="text-[10px] font-bold uppercase tracking-wider">Saved</span>
                        </div>
                        <button onclick="saveManualGrades()"
                                class="px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase shadow-sm hover:bg-blue-700 transition">
                            <i class="fas fa-save mr-1"></i>Save Grades
                        </button>
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <div class="flex items-center bg-gray-200 rounded-full p-0.5 mr-3">
                        ${(window.studentsAnalyticsLevel === 'SH' ? [1, 2, 3] : [1, 2, 3, 4]).map(q => `
                            <button onclick="setRecordQuarter(${q})"
                                    class="px-3 py-1 rounded-full text-[10px] font-bold uppercase transition
                                           ${window.currentRecordQuarter === q
            ? 'bg-white text-primary shadow-sm'
            : 'text-gray-500 hover:bg-white/50 hover:text-gray-700'}">
                                ${window.studentsAnalyticsLevel === 'SH' ? 'T' : 'Q'}${q}
                            </button>
                        `).join('')}
                    </div>
                    ${window.studentsAnalyticsLevel !== 'SH' ? `
                    <div class="flex items-center bg-gray-200 rounded-full p-0.5 mr-3">
                        <button onclick="setRecordSemester(1)"
                                class="px-3 py-1 rounded-full text-[10px] font-bold uppercase transition
                                       ${window.currentRecordSemester === 1
            ? 'bg-white text-primary shadow-sm'
            : 'text-gray-500 hover:bg-white/50 hover:text-gray-700'}">
                            1st Sem
                        </button>
                        <button onclick="setRecordSemester(2)"
                                class="px-3 py-1 rounded-full text-[10px] font-bold uppercase transition
                                       ${window.currentRecordSemester === 2
            ? 'bg-white text-primary shadow-sm'
            : 'text-gray-500 hover:bg-white/50 hover:text-gray-700'}">
                            2nd Sem
                        </button>
                    </div>
                    ` : ''}
                    ${currentUser.role === 'admin' ? `
                    <button onclick="setPinnedSection('all')"
                            class="px-3 py-1.5 rounded-full text-[10px] font-bold border uppercase tracking-wide transition shadow-sm
                                   ${currentRecordSection === 'all'
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'}">
                        All Sections
                    </button>
                    ` : ''}
                    ${sectionBtnsHtml}
                    ${unpinned.length > 0 ? `
                    <div class="flex items-center gap-1 border border-dashed border-gray-300 rounded-full px-2 py-1 hover:border-primary transition">
                        <i class="fas fa-plus text-gray-400 text-[9px]"></i>
                        <select onchange="addPinnedSection(this.value); this.value='';"
                                class="text-[10px] font-bold text-gray-500 bg-transparent outline-none cursor-pointer pr-1">
                            <option value="" disabled selected>Add Section</option>
                            ${unpinned.map(s => `<option value="${s}">${_getLabel(s)}</option>`).join('')}
                        </select>
                    </div>` : ''}
                </div>
            </div>
            <div class="overflow-auto flex-1 bg-white">
                <table class="w-full excel-table border-collapse min-w-[600px]">
                    <thead>
                        <tr>
                            <th class="w-48 text-left static-cell">Full Name</th>
                            <th class="static-cell">Section</th>
                            ${visibleSubjects.map(sub => `
                                <th class="cursor-pointer hover:bg-green-100 group transition text-primary static-cell"
                                    onclick="setSubjectView('${sub}')"
                                    title="Click to open Detailed E-Class Record for ${sub}">
                                    <div class="flex items-center justify-center gap-1">
                                        <span class="group-hover:underline">${sub}</span>
                                        <i class="fas fa-external-link-alt text-[8px] opacity-50 group-hover:opacity-100"></i>
                                    </div>
                                </th>
                            `).join('')}
                            <th class="bg-blue-50 text-blue-800 border-b-2 border-blue-200 static-cell">GWA</th>
                            <th class="static-cell">
                                <button onclick="currentAttendanceView = '${currentRecordSection}'; renderRecords(document.getElementById('content-area'))" 
                                        class="w-full h-full hover:bg-green-100 transition flex items-center justify-center gap-1 group"
                                        title="Click to manage monthly attendance for the entire section">
                                    <span class="group-hover:underline">Attendance</span>
                                    <i class="fas fa-edit text-[8px] opacity-50 group-hover:opacity-100"></i>
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody id="records-table-body"></tbody>
                </table>
            </div>
        </div>
            `;
    filterRecordsTable();
}

// ─── Pinned Section Helpers ───────────────────────────────────────────────────
function addPinnedSection(sec) {
    if (sec && !pinnedSections.includes(sec)) {
        pinnedSections.push(sec);
        savePinnedSections();
    }
    currentRecordSection = sec;
    renderRecords(document.getElementById('content-area'));
}

function removePinnedSection(sec) {
    if (currentUser.role !== 'teacher') {
        pinnedSections = pinnedSections.filter(s => s !== sec);
        savePinnedSections();
        if (currentRecordSection === sec) currentRecordSection = 'all';
        renderRecords(document.getElementById('content-area'));
        return;
    }

    const subject = currentUser.subject;
    const overlay = document.createElement('div');
    overlay.id = 'rm-section-overlay';
    overlay.className = 'fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in';
    overlay.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl p-7 max-w-sm w-full mx-4 border-t-4 border-red-500 animate-scale-up">
            <div class="flex items-start gap-3 mb-4">
                <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <i class="fas fa-exclamation-triangle text-red-500"></i>
                </div>
                <div>
                    <h3 class="font-bold text-gray-900 text-base">Remove Section?</h3>
                    <p class="text-xs text-gray-500 mt-1">
                        This will permanently <span class="font-bold text-red-600">delete all ${subject} grades</span>
                        entered for students in <span class="font-bold">${sec}</span>.
                        This cannot be undone.
                    </p>
                </div>
            </div>
            <div class="flex gap-3 mt-6">
                <button id="rm-cancel-btn" class="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition">Cancel</button>
                <button id="rm-confirm-btn" class="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition flex items-center justify-center gap-2">
                    <i class="fas fa-trash-alt"></i> Remove & Clear
                </button>
            </div>
        </div>
            `;
    document.body.appendChild(overlay);

    overlay.querySelector('#rm-cancel-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#rm-confirm-btn').addEventListener('click', async () => {
        const btn = overlay.querySelector('#rm-confirm-btn');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Clearing...';
        btn.disabled = true;

        try {
            await fetch('/api/grades/clear-section', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ section: sec, subject })
            });
        } catch { /* silent */ }

        students.forEach(s => {
            if (s.section !== sec) return;
            const idx = s.subjects.findIndex(x => x.n === subject);
            if (idx !== -1) s.subjects.splice(idx, 1);
            computeStudentGWA(s);
        });

        overlay.remove();
        pinnedSections = pinnedSections.filter(s => s !== sec);
        savePinnedSections();
        if (currentRecordSection === sec) currentRecordSection = 'all';
        showMessage(`Section "${sec}" removed and ${subject} grades cleared.`);
        renderRecords(document.getElementById('content-area'));
    });
}

function setPinnedSection(sec) {
    currentRecordSection = sec;
    renderRecords(document.getElementById('content-area'));
}

// ─── DETAILED E-CLASS RECORD VIEW ─────────────────────────────────────────────
function renderDetailedSubjectView(container, subject) {
    const rawSec = localStorage.getItem('cnhs_sections');
    const sectionsData = rawSec ? JSON.parse(rawSec) : [];
    const _getLabel = (name) => {
        const sObj = sectionsData.find(x => x.name === name);
        if (!sObj || !sObj.year) return name;
        const gNum = sObj.year.replace(/\D/g, '');
        return gNum ? `${gNum} - ${name}` : name;
    };
    const yearSections = sectionsData.filter(s => !s.schoolYear || s.schoolYear === (window.currentRecordSchoolYear || '2025-2026')).map(s => s.name);

    const visiblePinnedSections = pinnedSections.filter(sec => yearSections.includes(sec));
    const unpinned = yearSections.filter(s => !visiblePinnedSections.includes(s));

    if (currentRecordSection === 'all' && currentUser.role === 'teacher') {
        currentRecordSection = visiblePinnedSections.length > 0 ? visiblePinnedSections[0] : (yearSections.length > 0 ? yearSections[0] : null);
    }

    const quarterKey = `${subject}_Q${window.currentRecordQuarter || 1}`;
    let mScores = maxScores[quarterKey] || maxScores[subject] || {};

    let wwHeaders = '', ptHeaders = '', wwMaxInputs = '', ptMaxInputs = '';
    for (let i = 1; i <= MAX_WW; i++) {
        wwHeaders += `<th class="bg-blue-50 text-[10px] static-cell font-medium"> Q${i}</th> `;
        wwMaxInputs += `<th class="bg-blue-100 p-0 border border-blue-200">
            <input type="number" class="excel-input text-blue-900 font-bold" value="${mScores['ww' + i] || ''}"
                placeholder="Max" oninput="updateMaxScore('${subject}', 'ww${i}', this.value)">
            </th>`;
    }
    for (let i = 1; i <= MAX_PT; i++) {
        ptHeaders += `<th class="bg-green-50 text-[10px] static-cell font-medium"> T${i}</th> `;
        ptMaxInputs += `<th class="bg-green-100 p-0 border border-green-200">
            <input type="number" class="excel-input text-green-900 font-bold" value="${mScores['pt' + i] || ''}"
                placeholder="Max" oninput="updateMaxScore('${subject}', 'pt${i}', this.value)">
            </th>`;
    }

    const sectionBtnsHtml = visiblePinnedSections.map(sec => `
                <div class="inline-flex items-center rounded-full border text-[10px] font-bold overflow-hidden shadow-sm transition-all
                    ${currentRecordSection === sec
            ? 'bg-white text-primary border-white'
            : 'bg-white/20 text-white border-white/40 hover:bg-white/30'
        } ">
            <button onclick = "setPinnedSectionEClass('${sec}')" class="pl-3 pr-2 py-1 tracking-wide"> ${_getLabel(sec)}</button>
                <button onclick="removePinnedSection('${sec}')" title="Remove section"
                    class="pr-2 py-1 opacity-70 hover:opacity-100 hover:text-red-300 transition">
                    <i class="fas fa-times"></i>
                </button>
        </div>
            `).join('');

    let isSHS = false;
    
    // Check if the currently pinned sections indicate SHS
    if (visiblePinnedSections.length > 0) {
        const secName = visiblePinnedSections[0].toLowerCase();
        if (secName.includes('grade 11') || secName.includes('grade 12') || secName.includes('gr 11') || secName.includes('gr 12') || window.studentsAnalyticsLevel === 'SH') {
            isSHS = true;
        }
    }

    const quarterBtnsHtml = isSHS 
        ? [1, 2, 3].map(q => `
            <button onclick="setRecordQuarter(${q})"
                class="px-3 py-1 rounded-full text-[10px] font-bold uppercase transition
                               ${(window.currentRecordQuarter || 1) === q
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-white/80 hover:bg-white/20 hover:text-white'
                }">
                Term ${q}
            </button>`).join('')
        : [1, 2, 3, 4].map(q => `
            <button onclick = "setRecordQuarter(${q})"
        class="px-3 py-1 rounded-full text-[10px] font-bold uppercase transition
                       ${(window.currentRecordQuarter || 1) === q
            ? 'bg-white text-primary shadow-sm'
            : 'text-white/80 hover:bg-white/20 hover:text-white'
        } ">
            Q${q}
        </button>
            `).join('');

    const weights = getSubjectWeights(subject, { section: visiblePinnedSections[0] || '' });
    const wwWeight = (weights.ww * 100).toFixed(0);
    const ptWeight = (weights.pt * 100).toFixed(0);
    const qaWeight = (weights.qa * 100).toFixed(0);

    container.innerHTML = `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-slide-up flex flex-col" style="height: calc(100vh - 140px);">
            <div class="border-b shrink-0 text-white" style="background-color:#166534;">
                <div class="p-4 flex justify-between items-center gap-3">
                    <div class="flex items-center gap-3">
                        <button onclick="setSubjectView(null)"
                                class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white hover:text-primary transition shrink-0">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <div>
                            <h3 class="font-bold text-lg leading-tight">${subject} E-Class Record</h3>
                            <p class="text-[10px] text-green-200 uppercase tracking-widest">Type Raw Scores directly into the cells</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 flex-wrap justify-end">
                        <div class="relative hidden sm:block">
                            <i class="fas fa-search absolute left-3 top-2 text-gray-400 text-[10px]"></i>
                            <input type="text" value="${currentRecordSearch}"
                                   onkeyup="searchRecordsTable(this.value)" placeholder="Search..."
                                   class="pl-8 pr-2 py-1.5 border-0 rounded-lg text-[10px] outline-none bg-white/90 text-gray-800 w-36">
                        </div>
                        <button onclick="saveManualGrades()"
                                class="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-[10px] font-bold uppercase shadow-sm hover:bg-blue-600 transition">
                            <i class="fas fa-save mr-1"></i>Save Grades
                        </button>
                        <button onclick="openScanner('CLASS_RECORD')"
                                class="px-3 py-1.5 bg-accent text-white rounded-lg text-[10px] font-bold uppercase shadow-sm hover:bg-yellow-600 transition">
                            <i class="fas fa-camera mr-1"></i>Scan Record
                        </button>
                        <button onclick="printReport('${subject} E-Class Record - Q${window.currentRecordQuarter || 1}')"
                                class="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-[10px] font-bold uppercase shadow-sm hover:bg-purple-600 transition">
                            <i class="fas fa-print mr-1"></i>Print Grades
                        </button>
                    </div>
                </div>
                <div class="px-4 pb-3 flex flex-wrap items-center gap-2">
                    <div class="flex items-center bg-black/20 rounded-full p-0.5 mr-3">
                        ${quarterBtnsHtml}
                    </div>
                    ${currentUser.role === 'admin' ? `
                    <button onclick="setPinnedSectionEClass('all')"
                            class="px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide transition
                                   ${currentRecordSection === 'all'
                ? 'bg-white text-primary border-white'
                : 'bg-white/20 text-white border-white/40 hover:bg-white/30'}">
                        All Sections
                    </button>
                    ` : ''}
                    ${sectionBtnsHtml}
                    ${unpinned.length > 0 ? `
                    <div class="flex items-center gap-1 border border-dashed border-white/40 rounded-full px-2 py-1 hover:border-white/80 transition">
                        <i class="fas fa-plus text-white/60 text-[9px]"></i>
                        <select onchange="addPinnedSection(this.value); this.value='';"
                                class="text-[10px] font-bold text-white bg-transparent outline-none cursor-pointer tracking-wide">
                            <option value="" disabled selected class="text-gray-800">Add Section</option>
                            ${unpinned.map(s => `<option value="${s}" class="text-gray-800">${_getLabel(s)}</option>`).join('')}
                        </select>
                    </div>` : ''}
                </div>
            </div>
            <div class="overflow-auto flex-1 bg-white">
                <table class="w-full excel-table border-collapse min-w-[1200px]">
                    <thead>
                        <tr>
                            <th rowspan="2" class="w-48 text-left bg-gray-100 static-cell">Learner's Name</th>
                            <th rowspan="2" class="bg-gray-100 static-cell w-24" style="color:#166534;">Section</th>
                            <th colspan="${MAX_WW + 3}" class="bg-blue-50 text-blue-800 border-b border-blue-200 static-cell">
                                <div class="flex items-center justify-center gap-2">
                                    <button onclick="removeWWColumn()" class="w-5 h-5 flex items-center justify-center rounded-full hover:bg-blue-200 text-blue-600 font-bold px-1 py-1" title="Remove last WW column" ${MAX_WW <= 1 ? 'disabled style="opacity:0.3;"' : ''}>-</button>
                                    <span class="cursor-pointer hover:underline tooltip-trigger flex items-center gap-1" title="Edit Grading Weights" onclick="openGradingWeightsModal('${subject}')">Written Works (${wwWeight}%) <i class="fas fa-edit text-[10px]"></i></span>
                                    <button onclick="addWWColumn()" class="w-5 h-5 flex items-center justify-center rounded-full hover:bg-blue-200 text-blue-600 font-bold px-1 py-1" title="Add WW column" ${MAX_WW >= 10 ? 'disabled style="opacity:0.3;"' : ''}>+</button>
                                </div>
                            </th>
                            <th colspan="${MAX_PT + 3}" class="bg-green-50 text-green-800 border-b border-green-200 static-cell">
                                <div class="flex items-center justify-center gap-2">
                                    <button onclick="removePTColumn()" class="w-5 h-5 flex items-center justify-center rounded-full hover:bg-green-200 text-green-600 font-bold px-1 py-1" title="Remove last PT column" ${MAX_PT <= 1 ? 'disabled style="opacity:0.3;"' : ''}>-</button>
                                    <span class="cursor-pointer hover:underline tooltip-trigger flex items-center gap-1" title="Edit Grading Weights" onclick="openGradingWeightsModal('${subject}')">Performance Tasks (${ptWeight}%) <i class="fas fa-edit text-[10px]"></i></span>
                                    <button onclick="addPTColumn()" class="w-5 h-5 flex items-center justify-center rounded-full hover:bg-green-200 text-green-600 font-bold px-1 py-1" title="Add PT column" ${MAX_PT >= 10 ? 'disabled style="opacity:0.3;"' : ''}>+</button>
                                </div>
                            </th>
                            <th colspan="3" class="bg-purple-50 text-purple-800 border-b border-purple-200 static-cell">
                                <div class="flex items-center justify-center gap-2">
                                    <span class="cursor-pointer hover:underline tooltip-trigger flex items-center gap-1" title="Edit Grading Weights" onclick="openGradingWeightsModal('${subject}')">Assessment (${qaWeight}%) <i class="fas fa-edit text-[10px]"></i></span>
                                </div>
                            </th>
                            <th rowspan="2" class="bg-gray-200 static-cell border-l-2 border-gray-300 w-16">Initial Grade</th>
                            <th rowspan="2" class="bg-gray-300 static-cell border-l-2 border-gray-400 w-16 text-xs shadow-sm">${isSHS ? 'Term Grade' : 'Quarterly Grade'}</th>
                        </tr>
                        <tr>
                            ${wwHeaders}
                            <th class="bg-blue-50 text-[10px] static-cell font-bold">Total</th>
                            <th class="bg-blue-100 text-[10px] static-cell font-bold text-gray-600">PS</th>
                            <th class="bg-blue-200 text-[10px] font-bold static-cell border-r-2 border-blue-300">WS</th>
                            ${ptHeaders}
                            <th class="bg-green-50 text-[10px] static-cell font-bold">Total</th>
                            <th class="bg-green-100 text-[10px] static-cell font-bold text-gray-600">PS</th>
                            <th class="bg-green-200 text-[10px] font-bold static-cell border-r-2 border-green-300">WS</th>
                            <th class="bg-purple-50 text-[10px] static-cell font-medium">1</th>
                            <th class="bg-purple-100 text-[10px] static-cell font-bold text-gray-600">PS</th>
                            <th class="bg-purple-200 text-[10px] font-bold static-cell border-r-2 border-purple-300">WS</th>
                        </tr>
                        <tr class="bg-yellow-50 sticky top-[60px] z-20 shadow-sm border-b-2 border-gray-300">
                            <th class="text-right px-4 py-2 text-[10px] font-bold text-gray-700 static-cell border-r border-gray-300 bg-yellow-100" colspan="2">
                                HIGHEST POSSIBLE SCORE <i class="fas fa-arrow-right ml-2 text-primary"></i>
                            </th>
                            ${wwMaxInputs}
                            <th class="bg-blue-50 border-r border-blue-100"></th>
                            <th class="bg-blue-100 text-[10px] font-bold text-gray-600 border-r border-blue-200 text-center">100.00</th>
                            <th class="bg-blue-200 text-[10px] font-bold border-r-2 border-blue-300 text-center">${wwWeight}%</th>
                            ${ptMaxInputs}
                            <th class="bg-green-50 border-r border-green-100"></th>
                            <th class="bg-green-100 text-[10px] font-bold text-gray-600 border-r border-green-200 text-center">100.00</th>
                            <th class="bg-green-200 text-[10px] font-bold border-r-2 border-green-300 text-center">${ptWeight}%</th>
                            <th class="bg-purple-50 p-0 border border-purple-100">
                                <input type="number" class="excel-input text-purple-900 font-bold"
                                       value="${mScores['qa'] || ''}" placeholder="Max"
                                       oninput="updateMaxScore('${subject}', 'qa', this.value)">
                            </th>
                            <th class="bg-purple-100 text-[10px] font-bold text-gray-600 border-r border-purple-200 text-center">100.00</th>
                            <th class="bg-purple-200 text-[10px] font-bold border-r-2 border-purple-300 text-center">${qaWeight}%</th>
                            <th class="bg-gray-200 border-l-2 border-gray-300"></th>
                            <th class="bg-gray-300 border-l-2 border-gray-400"></th>
                        </tr>
                    </thead>
                    <tbody id="records-table-body"></tbody>
                </table>
            </div>
        </div>
            `;
    filterRecordsTable();
}

function setPinnedSectionEClass(sec) {
    currentRecordSection = sec;
    renderDetailedSubjectView(document.getElementById('content-area'), currentSubjectView);
}

function setSubjectView(sub) {
    currentSubjectView = sub;
    if (currentUser.role === 'admin' && !sub) {
        // Go back to the section students view if we came from it
        if (adminSelectedSection) {
            renderAdminSectionStudents(document.getElementById('content-area'));
        } else {
            renderAdminTeacherList(document.getElementById('content-area'));
        }
    } else {
        renderRecords(document.getElementById('content-area'));
    }
}

// ─── SHARED FILTER / TABLE RENDER ─────────────────────────────────────────────

function updateMaxScore(subject, field, val) {
    const key = `${subject}_Q${window.currentRecordQuarter || 1}`;
    if (!maxScores[key]) maxScores[key] = {};
    maxScores[key][field] = parseFloat(val) || null;
    saveMaxScores();
    students.forEach(s => { recalcStudentSubject(s, subject); computeStudentGWA(s); });
    filterRecordsTable();
}

function changeRecordSection(val) {
    currentRecordSection = val;
    filterRecordsTable();
}

function searchRecordsTable(val) {
    currentRecordSearch = val.toLowerCase();
    filterRecordsTable();
}

function filterRecordsTable() {
    const tbody = document.getElementById('records-table-body');
    if (!tbody) return;

    const visibleSubjects = currentUser.role === 'teacher'
        ? (currentUser.subject ? currentUser.subject.split(',').map(s => s.trim()) : [])
        : coreSubjects;

    let filtered = students;
    if (currentUser.role === 'teacher' && currentUser.handledSections && currentUser.handledSections.length > 0) {
        filtered = filtered.filter(s => currentUser.handledSections.includes(s.section));
    }
    if (currentRecordSection !== 'all') {
        if (currentRecordSection) {
            filtered = filtered.filter(s => s.section === currentRecordSection);
        } else {
            filtered = [];
        }
    }
    if (currentRecordSearch !== '') {
        filtered = filtered.filter(s =>
            s.name.toLowerCase().includes(currentRecordSearch) ||
            s.lrn.includes(currentRecordSearch)
        );
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr> <td colspan="30" class="py-8 text-center text-gray-400 italic">No students found.</td></tr> `;
        return;
    }

    if (currentSubjectView) {
        tbody.innerHTML = filtered.map(s => {
            const subData = s.subjects.find(x => x.n === currentSubjectView) || {};
            const colorClass = (subData.g !== null && subData.g !== undefined && subData.g < 75) ? 'text-red-600' : 'text-gray-900';

            let wwInputs = '';
            for (let i = 1; i <= MAX_WW; i++) {
                wwInputs += `<td class="bg-blue-50/10 hover:bg-blue-100 transition-colors">
            <input type="number" class="excel-input" value="${subData['ww' + i] || ''}" placeholder="-"
                oninput="updateInlineScore(this, '${s.lrn}', 'ww${i}', '${currentSubjectView}')">
            </td>`;
            }
            let ptInputs = '';
            for (let i = 1; i <= MAX_PT; i++) {
                ptInputs += `<td class="bg-green-50/10 hover:bg-green-100 transition-colors">
            <input type="number" class="excel-input" value="${subData['pt' + i] || ''}" placeholder="-"
                oninput="updateInlineScore(this, '${s.lrn}', 'pt${i}', '${currentSubjectView}')">
            </td>`;
            }

            return `
                <tr class="hover:bg-gray-50 transition border-b border-gray-200">
                    <td class="student-name border-r border-gray-200">${s.name}</td>
                    <td class="static-cell border-r border-gray-200" style="color:#166534;">${s.section}</td>
                    ${wwInputs}
                    <td class="font-bold text-blue-900 bg-blue-50/60 border-r border-blue-100 static-cell text-center" id="ww-total-${s.lrn}">${subData.wwTotal || '-'}</td>
                    <td class="text-gray-600 bg-blue-100/60 border-r border-blue-200 static-cell text-center" id="ww-ps-${s.lrn}">${subData.wwPS || '-'}</td>
                    <td class="font-bold text-blue-800 bg-blue-200/60 border-r-2 border-blue-300 static-cell text-center" id="ww-ws-${s.lrn}">${subData.wwWS || '-'}</td>
                    ${ptInputs}
                    <td class="font-bold text-green-900 bg-green-50/60 border-r border-green-100 static-cell text-center" id="pt-total-${s.lrn}">${subData.ptTotal || '-'}</td>
                    <td class="text-gray-600 bg-green-100/60 border-r border-green-200 static-cell text-center" id="pt-ps-${s.lrn}">${subData.ptPS || '-'}</td>
                    <td class="font-bold text-green-800 bg-green-200/60 border-r-2 border-green-300 static-cell text-center" id="pt-ws-${s.lrn}">${subData.ptWS || '-'}</td>
                    <td class="bg-purple-50/10 hover:bg-purple-100 transition-colors">
                        <input type="number" class="excel-input" value="${subData.qa || ''}" placeholder="-"
                               oninput="updateInlineScore(this, '${s.lrn}', 'qa', '${currentSubjectView}')">
                    </td>
                    <td class="text-gray-600 bg-purple-100/60 border-r border-purple-200 static-cell text-center" id="qa-ps-${s.lrn}">${subData.qaPS || '-'}</td>
                    <td class="font-bold text-purple-800 bg-purple-200/60 border-r-2 border-purple-300 static-cell text-center" id="qa-ws-${s.lrn}">${subData.qaWS || '-'}</td>
                    <td class="bg-gray-200 border-l-2 border-gray-300 text-center font-bold text-gray-800 static-cell" id="fin-i-${s.lrn}">
                        ${subData.initialGrade || '-'}
                    </td>
                    <td class="font-bold bg-gray-300 shadow-sm border-l-2 border-gray-400 text-base static-cell text-center ${colorClass}" id="fin-${s.lrn}">
                        ${subData.g !== null && subData.g !== undefined ? subData.g : '-'}
                    </td>
                </tr>
            `;
        }).join('');
    } else {
        tbody.innerHTML = filtered.map(s => {
            const subCols = visibleSubjects.map(subName => {
                const subData = s.subjects.find(x => x.n === subName);
                const grade = subData && subData.g !== null && subData.g !== undefined ? subData.g : null;
                if (grade === null) {
                    return `<td class="static-cell cursor-pointer hover:bg-green-50 transition" onclick="setSubjectView('${subName}')" title="Enter grades for ${subName}">
                        <div class="flex flex-col items-center justify-center opacity-50 hover:opacity-100 group transition">
                            <i class="fas fa-edit text-[10px] text-primary"></i>
                            <span class="text-[7.5px] uppercase tracking-wider text-primary font-bold mt-0.5 whitespace-nowrap">Input Grades</span>
                        </div>
                    </td>`;
                } else {
                    const colorClass = (grade < 75) ? 'text-red-500 font-bold' : 'text-gray-800 font-bold';
                    return `<td class="static-cell ${colorClass} cursor-pointer hover:bg-green-50 transition" onclick="setSubjectView('${subName}')" title="Edit ${subName} grades">
                        <div class="flex items-center justify-center gap-1 group">
                            <span>${grade}</span>
                            <i class="fas fa-edit text-[8px] text-primary opacity-0 group-hover:opacity-100 transition"></i>
                        </div>
                    </td>`;
                }
            }).join('');

            return `
            <tr class="hover:bg-blue-50/30 transition">
                    <td class="student-name border-r border-gray-200">${s.name}</td>
                    <td class="static-cell text-gray-500 border-r border-gray-200">${s.section}</td>
                    ${subCols}
                    <td class="static-cell font-bold text-primary bg-blue-50/30 border-l-2 border-blue-200">${s.gwa > 0 ? s.gwa : '-'}</td>
                    <td class="static-cell text-gray-600 cursor-pointer hover:bg-green-50 font-bold transition group" 
                        onclick="currentAttendanceView = '${s.section}'; renderAttendanceView(document.getElementById('content-area'), '${s.section}')" title="Click to open Daily Attendance Grid">
                        <div class="flex items-center justify-center">
                            <span class="px-2 py-1 rounded bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all whitespace-nowrap">
                                Input Attendance
                            </span>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

// ─── INLINE SCORE UPDATE + DEBOUNCED DB SAVE ──────────────────────────────────
function updateInlineScore(input, lrn, field, subject) {
    const s = students.find(x => x.lrn === lrn);
    if (!s) return;
    const val = input.value.trim();
    let sub = s.subjects.find(x => x.n === subject);
    if (!sub) {
        sub = { n: subject, quarter: window.currentRecordQuarter || 1 };
        s.subjects.push(sub);
        if (!s.allSubjects) s.allSubjects = [];
        s.allSubjects.push(sub);
    }

    const quarterKey = `${subject}_Q${window.currentRecordQuarter || 1}`;
    const MAX = maxScores[quarterKey] || maxScores[subject] || {};
    const max = parseFloat(MAX[field]);
    if (!isNaN(max) && parseFloat(val) > max) {
        input.value = max;
        sub[field] = max;
        input.classList.add('bg-red-100');
        setTimeout(() => input.classList.remove('bg-red-100'), 600);
    } else {
        sub[field] = val !== '' ? parseFloat(val) : undefined;
    }

    recalcStudentSubject(s, subject);
    computeStudentGWA(s);

    const wwTotalCell = document.getElementById(`ww-total-${lrn}`);
    const wwCell = document.getElementById(`ww-ps-${lrn}`);
    const wwWSCell = document.getElementById(`ww-ws-${lrn}`);
    
    const ptTotalCell = document.getElementById(`pt-total-${lrn}`);
    const ptCell = document.getElementById(`pt-ps-${lrn}`);
    const ptWSCell = document.getElementById(`pt-ws-${lrn}`);
    
    const qaCell = document.getElementById(`qa-ps-${lrn}`);
    const qaWSCell = document.getElementById(`qa-ws-${lrn}`);
    
    const finICell = document.getElementById(`fin-i-${lrn}`);
    const finCell = document.getElementById(`fin-${lrn}`);

    if (wwTotalCell) wwTotalCell.innerText = sub.wwTotal || '-';
    if (wwCell) wwCell.innerText = sub.wwPS || '-';
    if (wwWSCell) wwWSCell.innerText = sub.wwWS || '-';
    
    if (ptTotalCell) ptTotalCell.innerText = sub.ptTotal || '-';
    if (ptCell) ptCell.innerText = sub.ptPS || '-';
    if (ptWSCell) ptWSCell.innerText = sub.ptWS || '-';
    
    if (qaCell) qaCell.innerText = sub.qaPS || '-';
    if (qaWSCell) qaWSCell.innerText = sub.qaWS || '-';
    
    if (finICell) finICell.innerText = sub.initialGrade || '-';
    
    if (finCell) {
        finCell.innerText = sub.g !== null && sub.g !== undefined ? sub.g : '-';
        finCell.className = `font-bold bg-gray-300 shadow-sm border-l-2 border-gray-400 text-base static-cell text-center ${sub.g !== null && sub.g < 75 ? 'text-red-600' : 'text-gray-900'}`;
    }

    if (!window._gradeTimers) window._gradeTimers = {};
    const timerKey = lrn + '_' + subject;

    // Show saving status
    const status = document.getElementById('save-status');
    if (status) {
        status.innerHTML = '<i class="fas fa-spinner fa-spin text-[10px]"></i> <span class="text-[10px] font-bold uppercase tracking-wider">Saving...</span>';
        status.classList.remove('hidden', 'bg-green-50', 'text-primary');
        status.classList.add('bg-blue-50', 'text-blue-600', 'border-blue-100');
    }

    clearTimeout(window._gradeTimers[timerKey]);
    window._gradeTimers[timerKey] = setTimeout(async () => {
        const scores = {};
        for (let i = 1; i <= MAX_WW; i++) scores['ww' + i] = sub['ww' + i] ?? null;
        for (let i = 1; i <= MAX_PT; i++) scores['pt' + i] = sub['pt' + i] ?? null;
        scores.qa = sub.qa ?? null;
        try {
            await fetch('/api/grades/save-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ lrn, subject, scores, grade: sub.g ?? null, gwa: s.gwa ?? null, quarter: window.currentRecordQuarter || 1, school_year: window.currentRecordSchoolYear || '2025-2026' })
            });
            // Show saved status briefly
            if (status) {
                status.innerHTML = '<i class="fas fa-check-circle text-[10px]"></i> <span class="text-[10px] font-bold uppercase tracking-wider">Saved</span>';
                status.classList.remove('bg-blue-50', 'text-blue-600', 'border-blue-100');
                status.classList.add('bg-green-50', 'text-primary', 'border-green-100');
                setTimeout(() => status.classList.add('hidden'), 2000);
            }
        } catch {
            if (status) {
                status.innerHTML = '<i class="fas fa-exclamation-triangle text-[10px]"></i> <span class="text-[10px] font-bold uppercase tracking-wider">Error</span>';
                status.classList.add('bg-red-50', 'text-red-500', 'border-red-100');
            }
        }
    }, 600);
}

// ─── MANUAL BATCH SAVE ────────────────────────────────────────────────────────
async function saveManualGrades() {
    const btn = event.currentTarget;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Saving...';
    btn.disabled = true;

    const visibleSubjects = currentUser.role === 'teacher'
        ? (currentUser.subject ? currentUser.subject.split(',').map(s => s.trim()) : [])
        : coreSubjects;

    const savePromises = [];
    let filtered = students;
    if (currentUser.role === 'teacher' && currentUser.handledSections) {
        filtered = filtered.filter(s => currentUser.handledSections.includes(s.section));
    }
    if (currentRecordSection !== 'all') {
        filtered = filtered.filter(s => s.section === currentRecordSection);
    }
    if (currentRecordSearch !== '') {
        const srch = currentRecordSearch.toLowerCase();
        filtered = filtered.filter(s => s.name.toLowerCase().includes(srch) || s.lrn.includes(srch));
    }

    filtered.forEach(s => {
        const subjects = currentSubjectView ? [currentSubjectView] : visibleSubjects;
        subjects.forEach(subName => {
            const subObj = s.subjects.find(x => x.n === subName);
            if (subObj) {
                const scores = {};
                for (let i = 1; i <= MAX_WW; i++) scores['ww' + i] = subObj['ww' + i] ?? null;
                for (let i = 1; i <= MAX_PT; i++) scores['pt' + i] = subObj['pt' + i] ?? null;
                scores.qa = subObj.qa ?? null;
                savePromises.push(
                    fetch('/api/grades/save-bulk', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        body: JSON.stringify({ lrn: s.lrn, subject: subName, scores, grade: subObj.g ?? null, gwa: s.gwa ?? null, quarter: window.currentRecordQuarter || 1 })
                    })
                );
            }
        });
    });

    try {
        await Promise.allSettled(savePromises);
        btn.innerHTML = '<i class="fas fa-check mr-1"></i>Saved!';
        setTimeout(() => { btn.innerHTML = originalHtml; btn.disabled = false; }, 2000);
    } catch {
        btn.innerHTML = '<i class="fas fa-times mr-1"></i>Failed';
        setTimeout(() => { btn.innerHTML = originalHtml; btn.disabled = false; }, 2000);
    }
}

// ─── Attendance View (DepEd SF2) ─────────────────────────────────────────────
// ─── Attendance View (DepEd SF2) ─────────────────────────────────────────────
function renderAttendanceView(container, section) {
    const ss = students.filter(s => s.section === section).sort((a, b) => a.name.localeCompare(b.name));
    const sy = window.currentRecordSchoolYear || '2025-2026';
    const monthObj = ATT_MONTHS.find(m => m.m === currentAttendanceMonth) || ATT_MONTHS[0];

    // We'll show 5 weeks of M-F (25 days total) to match the template
    const weeks = [1, 2, 3, 4, 5];
    const days = ['M', 'T', 'W', 'T', 'F'];

    container.innerHTML = `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-slide-up flex flex-col" style="height: calc(100vh - 140px);">
            <div class="p-4 border-b bg-gray-50/50 shrink-0 flex flex-col gap-3">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <button onclick="currentAttendanceView=null; renderRecords(document.getElementById('content-area'))" 
                                class="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition shadow-sm">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <div>
                            <h3 class="font-bold text-gray-800 text-lg">Daily Attendance Sheet (SF2)</h3>
                            <p class="text-xs text-gray-400">Section: <span class="font-bold text-primary">${section}</span> | ${currentAttendanceMonth} ${sy}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="openScanner('ATTENDANCE')" class="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition shadow-md flex items-center gap-2">
                            <i class="fas fa-camera"></i> AI Scan Sheet
                        </button>
                        <button onclick="saveBulkAttendance('${section}')" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition shadow-md flex items-center gap-2">
                            <i class="fas fa-save"></i> Save Monthly Record
                        </button>
                    </div>
                </div>
                <div class="flex items-center gap-4 bg-white p-3 rounded-xl border border-gray-100">
                    <div class="flex items-center gap-2">
                         <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Month:</label>
                         <select onchange="currentAttendanceMonth = this.value; renderAttendanceView(document.getElementById('content-area'), '${section}')" 
                                 class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold bg-gray-50 outline-none focus:border-primary">
                             ${ATT_MONTHS.map(m => `<option value="${m.m}" ${m.m === currentAttendanceMonth ? 'selected' : ''}>${m.m}</option>`).join('')}
                         </select>
                    </div>
                    <div class="h-6 w-px bg-gray-100"></div>
                    <div class="flex items-center gap-3">
                         <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Legend:</span>
                         <div class="flex items-center gap-2">
                            <span class="w-4 h-4 rounded-sm border border-gray-200 bg-gray-50 flex items-center justify-center text-[10px] font-bold">/</span>
                            <span class="text-[10px] text-gray-500">Present</span>
                         </div>
                         <div class="flex items-center gap-2">
                            <span class="w-4 h-4 rounded-sm border border-gray-200 bg-gray-50 flex items-center justify-center text-[10px] font-bold text-red-500">x</span>
                            <span class="text-[10px] text-gray-500">Absent</span>
                         </div>
                    </div>
                </div>
            </div>
            <div class="overflow-auto flex-1 bg-white">
                <table class="w-full excel-table border-collapse min-w-[1200px]">
                    <thead>
                        <tr class="bg-gray-100/80 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 sticky top-0 z-20">
                            <th rowspan="2" class="px-6 py-4 text-left w-64 border-r border-gray-200 bg-gray-50 sticky left-0 z-30">Student Full Name</th>
                            ${weeks.map(w => `<th colspan="5" class="px-2 py-2 text-center border-r border-gray-200">Week ${w}</th>`).join('')}
                            <th rowspan="2" class="px-4 py-4 text-center w-20 bg-green-50 text-primary border-l border-gray-200">Pres.</th>
                            <th rowspan="2" class="px-4 py-4 text-center w-20 bg-red-50 text-red-600 border-l border-gray-200">Abs.</th>
                        </tr>
                        <tr class="bg-gray-50 text-[9px] font-bold text-gray-400 border-b border-gray-200 sticky top-[48px] z-20">
                            ${weeks.map(() => days.map(d => `<th class="px-1 py-1 text-center border-r border-gray-100 w-8">${d}</th>`).join('')).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${ss.map(s => {
        const attRec = (s.lastAttendanceRecords || []).find(r => r.month === currentAttendanceMonth && r.school_year === sy) || { days_present: 0, daily_marks: [] };
        const marks = attRec.daily_marks || [];
        return `
                                <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition group">
                                    <td class="px-6 py-3 font-bold text-gray-700 border-r border-gray-100 bg-gray-50/30 sticky left-0 z-10">
                                        <div class="flex items-center gap-2">
                                            <button onclick="openAttendanceModal('${s.lrn}')" class="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-primary/10 hover:text-primary transition shadow-sm no-print" title="View Monthly Summary">
                                                <i class="fas fa-calendar-check text-[10px]"></i>
                                            </button>
                                            <span>${s.name}</span>
                                        </div>
                                    </td>
                                    ${Array.from({ length: 25 }).map((_, i) => {
            const val = marks[i] || '';
            return `
                                            <td class="p-0 border-r border-gray-100 w-8">
                                                <input type="text" 
                                                       value="${val}" 
                                                       data-lrn="${s.lrn}" 
                                                       data-idx="${i}"
                                                       oninput="validateAttendanceMark(this); updateStudentAttendanceRow('${s.lrn}')"
                                                       class="w-full h-10 text-center text-xs font-black bg-transparent outline-none focus:bg-primary/5 focus:ring-1 focus:ring-inset focus:ring-primary/20 transition-all ${val === 'x' ? 'text-red-500' : 'text-primary'}"
                                                       placeholder="-">
                                            </td>
                                        `;
        }).join('')}
                                    <td class="px-2 py-3 text-center bg-green-50/30 font-black text-primary border-l border-gray-100" id="present-${s.lrn}">${attRec.days_present || 0}</td>
                                    <td class="px-2 py-3 text-center bg-red-50/30 font-black text-red-500 border-l border-gray-100" id="absent-${s.lrn}">${attRec.school_days ? Math.max(0, attRec.school_days - (attRec.days_present || 0)) : marks.filter(m => m === 'x').length}</td>
                                </tr>
                            `;
    }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    const needsFetch = !fetchedAttendanceSections.has(section);
    if (needsFetch) {
        fetchedAttendanceSections.add(section);
        fetch(`/api/attendance/section/${encodeURIComponent(section)}`)
            .then(res => res.ok ? res.json() : {})
            .then(data => {
                ss.forEach(s => {
                    if (data[s.lrn]) s.lastAttendanceRecords = data[s.lrn];
                });
                if (currentAttendanceView === section) renderAttendanceView(container, section);
            })
            .catch(() => {
                setTimeout(() => fetchedAttendanceSections.delete(section), 5000);
            });
    } else {
        ss.forEach(s => updateStudentAttendanceRow(s.lrn));
    }
}

function validateAttendanceMark(inp) {
    const v = inp.value.toLowerCase();
    if (v === 'p' || v === '1' || v === '/') inp.value = '/';
    else if (v === 'a' || v === '0' || v === 'x') inp.value = 'x';
    else inp.value = '';

    if (inp.value === 'x') inp.classList.add('text-red-500');
    else inp.classList.remove('text-red-500');
}

function updateStudentAttendanceRow(lrn) {
    const inputs = document.querySelectorAll(`input[data-lrn="${lrn}"][data-idx]`);
    let present = 0;
    let absent = 0;

    inputs.forEach(inp => {
        if (inp.value === '/') present++;
        else if (inp.value === 'x') absent++;
    });

    const presentEl = document.getElementById(`present-${lrn}`);
    const absentEl = document.getElementById(`absent-${lrn}`);

    if (presentEl) presentEl.innerText = present;
    if (absentEl) absentEl.innerText = absent;
}

function setGlobalSchoolDays(val) {
    // Deprecated for daily marks
}

function updateOverallAttendanceTotals() {
    if (currentAttendanceView) {
        students.filter(s => s.section === currentAttendanceView).forEach(s => {
            updateStudentAttendanceRow(s.lrn);
        });
    }
}

async function saveBulkAttendance(section) {
    const sy = window.currentRecordSchoolYear || '2025-2026';
    const records = [];

    students.filter(s => s.section === section).forEach(s => {
        const inputs = document.querySelectorAll(`input[data-lrn="${s.lrn}"][data-idx]`);
        const daily_marks = [];
        let presentCount = 0;

        inputs.forEach(inp => {
            const mark = inp.value || '';
            daily_marks.push(mark);
            if (mark === '/') presentCount++;
        });

        // Use the count of marked days (/, x) as the school days for this specific student's record
        // Or better, use a fixed count if provided. For now, we use present+absent as the total "school days we tracked"
        const schoolDaysThisMonth = daily_marks.filter(m => m === '/' || m === 'x').length;

        records.push({
            lrn: s.lrn,
            school_days: schoolDaysThisMonth,
            days_present: presentCount,
            daily_marks: daily_marks
        });
    });

    try {
        const res = await fetch('/api/attendance/save-section-bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                month: currentAttendanceMonth,
                school_year: sy,
                records: records
            })
        });

        if (res.ok) {
            showMessage("Daily attendance sheet saved successfully!");
            await initAppData();
            renderRecords(document.getElementById('content-area'));
        } else {
            showMessage("Failed to save records.", true);
        }
    } catch (e) {
        showMessage("Connection error.", true);
    }
}

function printReport(title) {
    const tableDiv = document.querySelector('.excel-table')?.parentElement;
    if (!tableDiv) {
        alert("No table found to print.");
        return;
    }

    // Prepare print content
    const printContents = tableDiv.innerHTML;
    const originalTitle = document.title;
    
    // Create an iframe to print from so we don't mess up current document state
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow.document;
    
    // Add tailored styles for print layout
    doc.write(`
        <html>
        <head>
            <title>${title}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                body {
                    font-family: 'Inter', sans-serif;
                    padding: 20px;
                    color: #111827;
                    font-size: 11px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 20px;
                    border-bottom: 2px solid #166534;
                    padding-bottom: 10px;
                }
                h1 { margin: 0; font-size: 18px; color: #166534; }
                p { margin: 2px 0; color: #4b5563; }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 10px;
                }
                th, td {
                    border: 1px solid #d1d5db;
                    padding: 4px 6px;
                    text-align: center;
                }
                th {
                    background-color: #f3f4f6 !important;
                    font-weight: bold;
                    color: #374151;
                }
                .text-left { text-align: left; }
                input.excel-input {
                    border: none;
                    background: transparent;
                    width: 100%;
                    text-align: center;
                    font-weight: bold;
                    pointer-events: none;
                }
                button { display: none !important; } /* hide all buttons in print */
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>AI-Driven Student Evaluation System</h1>
                <p><strong>${title}</strong></p>
                <p>Printed on: ${new Date().toLocaleString()}</p>
            </div>
            ${printContents}
            <script>
                // Map inputs to their values so they render properly in print
                document.querySelectorAll('input').forEach(el => {
                    el.setAttribute('value', el.value);
                    el.outerHTML = '<span>' + (el.value || '') + '</span>';
                });
            <\/script>
        </body>
        </html>
    `);
    
    doc.close();

    // Give it a moment to render styles securely
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 250);
}
