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

function resolveSubjectsForSection(secName, studentList) {
    if (!studentList || studentList.length === 0) return typeof coreSubjects !== 'undefined' ? coreSubjects : [];
    let dynamicSubjects = [];
    if (typeof getSubjectsForReport === 'function') {
        const isSHS = secName.toLowerCase().includes('grade 11') || secName.toLowerCase().includes('grade 12') || secName.toLowerCase().includes('gr 11') || secName.toLowerCase().includes('gr 12');
        const level = isSHS ? 'SH' : 'JH';
        let gradeNum = 7;
        if (typeof getStudentGradeNumber === 'function') {
            gradeNum = getStudentGradeNumber(studentList[0]) || 7;
        }
        dynamicSubjects = getSubjectsForReport(level, studentList[0].strand || null, gradeNum, window.currentRecordSemester || 1);
    }
    if (!dynamicSubjects || dynamicSubjects.length === 0) {
        let allSubs = [];
        studentList.forEach(s => {
            (s.subjects || []).forEach(sub => { if (!allSubs.includes(sub.n)) allSubs.push(sub.n); });
            (s.allSubjects || []).forEach(sub => { if (!allSubs.includes(sub.n)) allSubs.push(sub.n); });
        });
        dynamicSubjects = allSubs.length > 0 ? allSubs : (typeof coreSubjects !== 'undefined' ? coreSubjects : []);
    }
    return dynamicSubjects;
}



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
                // Do not recalculate subjects on quarter switch to preserve DB-fetched grades (like AI Excel uploads)
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

        let finalSections = [...teacherSections].filter(Boolean);
        
        // Filter sections based on teacher's level and strand to avoid showing opposite level's sections
        let allSecs = [];
        try { allSecs = JSON.parse(localStorage.getItem('cnhs_sections') || '[]'); } catch(e){}

        if (currentUser.level === 'SH') {
            const myStrand = currentUser.strand; 
            finalSections = finalSections.filter(secName => {
                let match = secName.match(/\b([7-9]|1[0-2])\b/);
                let gl = match ? parseInt(match[1]) : null;
                if (!gl) {
                    const sd = allSecs.find(x => x.name === secName);
                    if (sd && sd.year) {
                        let m2 = sd.year.match(/\b([7-9]|1[0-2])\b/);
                        if (m2) gl = parseInt(m2[1]);
                    }
                }
                
                // Hide JHS sections from SHS teacher
                if (gl && gl <= 10) return false;
                
                // If teacher belongs to a specific strand, strictly require the section to match
                if (myStrand) {
                    const secObj = allSecs.find(s => s.name === secName);
                    if (!secObj || secObj.strand !== myStrand) {
                        return false;
                    }
                }
                return true;
            });
        } else if (currentUser.level === 'JH') {
            finalSections = finalSections.filter(secName => {
                let match = secName.match(/\b([7-9]|1[0-2])\b/);
                let gl = match ? parseInt(match[1]) : null;
                if (!gl) {
                    const sd = allSecs.find(x => x.name === secName);
                    if (sd && sd.year) {
                        let m2 = sd.year.match(/\b([7-9]|1[0-2])\b/);
                        if (m2) gl = parseInt(m2[1]);
                    }
                }
                
                // Hide SHS sections from JHS teacher
                if (gl && gl >= 11) return false;
                
                return true;
            });
        }

        currentUser.handledSections = finalSections.sort();

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
    } else if (adminRecordsTab === 'advisory') {
        if (adminSelectedSection && adminSelectedTeacher) {
            renderAdviserSectionStudents(container);
        } else {
            renderAdminAdvisoryList(container);
        }
    } else if (adminSelectedSection && adminSelectedTeacher) {
        if (currentSubjectView) {
            renderDetailedSubjectView(container, currentSubjectView);
        } else {
            renderAdminSectionStudents(container);
        }
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
            const atRisk = ss.filter(s => (s.gwa > 0 && s.gwa < 75) || (s.subjects || []).some(x => x.g !== null && parseFloat(x.g) < 75) || (s.allSubjects || []).some(x => x.g !== null && parseFloat(x.g) < 75)).length;
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

    let jhsSections = availableSections.filter(sec => {
        let match = sec.match(/\b([7-9]|1[0-2])\b/);
        return match && parseInt(match[1]) <= 10;
    });
    let shsSections = availableSections.filter(sec => {
        let match = sec.match(/\b([7-9]|1[0-2])\b/);
        if (match && parseInt(match[1]) >= 11) {
            const myTeacherRec = teachers.find(t => t.id === currentUser.id);
            const myStrand = myTeacherRec ? (myTeacherRec.strand || currentUser.strand) : null;
            if (myStrand) {
                try {
                    let saved = JSON.parse(localStorage.getItem('cnhs_sections') || '[]');
                    let sd = saved.find(x => x.name === sec);
                    if (!sd || sd.strand !== myStrand) return false;
                } catch(e) {}
            }
            return true;
        }
        return false;
    });

    const myTeacherRec = teachers.find(t => t.id === currentUser.id);
    const myLevel = myTeacherRec ? (myTeacherRec.level || currentUser.level || 'JH') : (currentUser.level || 'JH');

    // Enforce Level Constraints
    if (myLevel === 'JH') shsSections = [];
    if (myLevel === 'SH') jhsSections = [];

    const overlay = document.createElement('div');
    overlay.id = 'add-adviser-sec-modal';
    overlay.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in';

    const getGrade = (secName) => {
        let match = secName.match(/\b([7-9]|1[0-2])\b/);
        if (match) return 'Grade ' + match[1];
        try {
            let saved = JSON.parse(localStorage.getItem('cnhs_sections') || '[]');
            let sd = saved.find(x => x.name === secName);
            if (sd && sd.year) {
                let m = sd.year.match(/\b([7-9]|1[0-2])\b/);
                if (m) return 'Grade ' + m[1];
            }
        } catch (e) { }
        return 'Unknown';
    };

    const allAvailableGrades = Array.from(new Set(availableSections.map(s => getGrade(s)).filter(g => g !== 'Unknown'))).sort((a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')));

    let listHTML = '';
    if (jhsSections.length === 0 && shsSections.length === 0) {
        listHTML = '<div class="p-6 text-center text-gray-400 italic text-sm">No available sections remaining for your assigned level.</div>';
    } else {
        if (jhsSections.length > 0) {
            listHTML += '<div class="px-4 py-2 border-y border-green-100 text-[10px] font-bold text-primary uppercase tracking-widest bg-green-50 sticky top-0 z-10">Junior High School</div>';
            listHTML += jhsSections.map(sec => `
                <div onclick="selectAdviserSectionCell(this, '${sec}')" data-grade="${getGrade(sec)}" class="adviser-section-option px-5 py-3.5 cursor-pointer hover:bg-green-50 transition border-b border-gray-100 last:border-0 text-sm text-gray-700 font-medium flex justify-between items-center group">
                    <span>${sec}</span><i class="fas fa-check text-white group-[.selected]:text-primary transition opacity-0 group-[.selected]:opacity-100"></i>
                </div>
            `).join('');
        }
        if (shsSections.length > 0) {
            listHTML += '<div class="px-4 py-2 border-y border-blue-100 text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 sticky top-0 z-10">Senior High School</div>';
            listHTML += shsSections.map(sec => `
                <div onclick="selectAdviserSectionCell(this, '${sec}')" data-grade="${getGrade(sec)}" class="adviser-section-option px-5 py-3.5 cursor-pointer hover:bg-blue-50 transition border-b border-gray-100 last:border-0 text-sm text-gray-700 font-medium flex justify-between items-center group">
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
            
            <div class="shrink-0 mb-4 flex gap-2">
                <div class="w-1/3 relative">
                    <select id="adviser-grade-filter" onchange="filterAdviserSections()" class="w-full pl-3 pr-8 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition appearance-none">
                        <option value="All">All Grades</option>
                        ${allAvailableGrades.map(g => `<option value="${g}">${g}</option>`).join('')}
                    </select>
                    <i class="fas fa-chevron-down absolute right-3 top-4 text-[10px] text-gray-400 pointer-events-none"></i>
                </div>
                <div class="w-2/3 relative">
                    <i class="fas fa-search absolute left-4 top-3.5 text-gray-400"></i>
                    <input type="text" id="search-adviser-section" placeholder="Search sections..." class="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition" onkeyup="filterAdviserSections()">
                </div>
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

    window.filterAdviserSections = function () {
        const queryEl = document.getElementById('search-adviser-section');
        const filterEl = document.getElementById('adviser-grade-filter');
        if (!queryEl || !filterEl) return;
        const q = queryEl.value.toLowerCase();
        const f = filterEl.value;

        document.querySelectorAll('.adviser-section-option').forEach(el => {
            const text = el.innerText.toLowerCase();
            const g = el.getAttribute('data-grade');

            const matchQ = text.includes(q);
            const matchF = (f === 'All' || g === f);

            if (matchQ && matchF) {
                el.classList.remove('hidden');
                el.classList.add('flex');
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
    const sec = adviserSelectedSection || adminSelectedSection;
    if (!sec) {
        if (typeof adminRecordsTab !== 'undefined' && adminRecordsTab === 'advisory') {
            renderAdminAdvisoryList(container);
        } else {
            renderAdviserSectionList(container);
        }
        return;
    }

    const search = adviserSearch.toLowerCase();
    let secStudents = students.filter(s => s.section === sec);
    if (search) secStudents = secStudents.filter(s => s.name.toLowerCase().includes(search) || s.lrn.includes(search));

    let dynamicSubjects = [];
    if (typeof getSubjectsForReport === 'function') {
        const isSHS = sec.toLowerCase().includes('grade 11') || sec.toLowerCase().includes('grade 12') || sec.toLowerCase().includes('gr 11') || sec.toLowerCase().includes('gr 12');
        const level = isSHS ? 'SH' : 'JH';
        let gradeNum = 7;
        if (typeof getStudentGradeNumber === 'function') gradeNum = getStudentGradeNumber(secStudents.length > 0 ? secStudents[0] : { section: sec }) || 7;
        dynamicSubjects = getSubjectsForReport(level, null, gradeNum, window.currentRecordSemester || 1);
    }
    if (!dynamicSubjects || dynamicSubjects.length === 0) {
        let allSubs = [];
        secStudents.forEach(s => {
            (s.subjects || []).forEach(sub => { if (!allSubs.includes(sub.n)) allSubs.push(sub.n); });
            (s.allSubjects || []).forEach(sub => { if (!allSubs.includes(sub.n)) allSubs.push(sub.n); });
        });
        dynamicSubjects = allSubs.length > 0 ? allSubs : (typeof coreSubjects !== 'undefined' ? coreSubjects : []);
    }

    const subjectHeaders = dynamicSubjects.map(sub => '<th class="static-cell text-gray-600">' + sub + '</th>').join('');

    const rows = secStudents.length === 0
        ? '<tr><td colspan="30" class="py-12 text-center text-gray-400 italic">No students found.</td></tr>'
        : secStudents.map(s => {
            const isSemMode = window.currentRecordSemester !== null;
            const semQuarters = window.currentRecordSemester === 1 ? [1, 2] : [3, 4];

            let studentSemGrades = [];

            const subCols = dynamicSubjects.map(subName => {
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
                const hasFailing = (s.grades && Object.values(s.grades).some(g => parseFloat(g) < 75)) || (s.subjects || []).some(x => x.g !== null && parseFloat(x.g) < 75) || (s.allSubjects || []).some(x => x.g !== null && parseFloat(x.g) < 75);

                if (isSH) {
                    if (gwaVal >= 90 && !hasFailing) {
                        badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-700 font-bold">Academic Excellence Award</span>';
                    } else if (gwaVal >= 75 && !hasFailing) {
                        badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-green-100 text-green-600 font-bold">Regular</span>';
                    } else if (gwaVal > 0 || hasFailing) {
                        badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-600 font-bold">Failing</span>';
                    }
                } else {
                    if (gwaVal >= 98 && !hasFailing) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-700 font-bold">Highest Honor</span>';
                    else if (gwaVal >= 95 && !hasFailing) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 font-bold">High Honor</span>';
                    else if (gwaVal >= 90 && !hasFailing) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-bold">With Honor</span>';
                    else if (gwaVal >= 75 && !hasFailing) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-green-100 text-green-600 font-bold">Regular</span>';
                    else if (gwaVal > 0 || hasFailing) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-600 font-bold">Failing</span>';
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
                <button onclick="${typeof adminRecordsTab !== 'undefined' && adminRecordsTab === 'advisory' ? "adminSelectedSection = null; adminSelectedTeacher = null; renderRecords(document.getElementById('content-area'));" : "adviserSelectedSection = null; renderAdviserRecords(document.getElementById('content-area'));"}"
                    class="text-gray-400 hover:text-primary font-semibold transition">
                    <i class="fas fa-home mr-1"></i> ${typeof adminRecordsTab !== 'undefined' && adminRecordsTab === 'advisory' ? "Advisory Teachers" : "My Sections"}
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
                            <i class="fas fa-eye mr-1"></i>Adviser view — all subjects visible.
                        </p>
                    </div>
                    <!-- Right side top bar -->
                    <div class="flex gap-2 items-center flex-wrap">
                        <select onchange="setRecordQuarter(this.value)" class="px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] outline-none focus:border-primary transition font-bold text-gray-700 bg-white shadow-sm h-[34px]">
                            <option value="ALL" ${window.currentRecordQuarter === 'ALL' || !window.currentRecordQuarter ? 'selected' : ''}>All Terms</option>
                            ${(function () {
            let gpList = ['1', '2', '3', '4'];
            if (typeof globalSettings !== 'undefined' && globalSettings['grading_periods']) {
                try {
                    let parsed = JSON.parse(globalSettings['grading_periods']);
                    if (Array.isArray(parsed) && parsed.length > 0) gpList = parsed;
                } catch (e) { }
            }
            return gpList.map(gp => {
                let label = 'Term ' + gp;
                return `<option value="${gp}" ${window.currentRecordQuarter == gp ? 'selected' : ''}>${label}</option>`;
            }).join('');
        })()}
                        </select>
                        ${false ? `
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
        if (s.section && s.section !== 'null' && s.subjects && s.subjects.some(sub => subjects.includes(sub.n))) {
            let addIt = true;
            if (currentUser.role === 'curriculum_coordinator') {
                let gl = null;
                const match = s.section.match(/\b([7-9]|1[0-2])\b/);
                if (match) {
                    gl = parseInt(match[1]);
                } else {
                    let allSecs = [];
                    try { allSecs = JSON.parse(localStorage.getItem('cnhs_sections') || '[]'); } catch(e){}
                    const sd = allSecs.find(x => x.name.toLowerCase() === s.section.toLowerCase());
                    if (sd && sd.year) {
                        const m2 = sd.year.match(/\b([7-9]|1[0-2])\b/);
                        if (m2) gl = parseInt(m2[1]);
                    }
                }
                
                if (currentUser.department === 'JHS' && gl && gl >= 11) addIt = false;
                if (currentUser.department === 'SHS' && gl && gl <= 10) addIt = false;
            }
            if (addIt) sections.add(s.section);
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
                <div class="flex flex-col itemsp-2 w-full md:w-auto">
                    <!-- Teachers / Students Tab -->
                    <div class="flex gap-1 bg-gray-100 rounded-2xl p-1">
                        <button onclick="switchRecordsTab('teachers')" class="px-5 py-2 rounded-xl text-sm font-bold transition ${adminRecordsTab === 'teachers' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-primary'}">
                            <i class="fas fa-chalkboard-teacher mr-1.5"></i>Teachers
                        </button>
                        <button onclick="switchRecordsTab('advisory')" class="px-5 py-2 rounded-xl text-sm font-bold transition ${adminRecordsTab === 'advisory' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-primary'}">
                            <i class="fas fa-star mr-1.5"></i>Advisory
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
    if (adminRecordsTab === 'advisory') {
        renderAdminAdvisoryList(document.getElementById('content-area'));
    } else {
        renderAdminTeacherList(document.getElementById('content-area'));
    }
}

function switchRecordsTab(tab) {
    adminRecordsTab = tab;
    adminSelectedTeacher = null;
    adminSelectedSection = null;
    if (tab === 'students') {
        renderAdminStudentsAnalytics(document.getElementById('content-area'));
    } else if (tab === 'advisory') {
        renderAdminAdvisoryList(document.getElementById('content-area'));
    } else {
        renderAdminTeacherList(document.getElementById('content-area'));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENTS ANALYTICS VIEW
// ─────────────────────────────────────────────────────────────────────────────
window.studentsAnalyticsGrade = window.studentsAnalyticsGrade || 'all';
window.studentsAnalyticsSection = window.studentsAnalyticsSection || 'all';
window.studentsAnalyticsSelectedLRN = window.studentsAnalyticsSelectedLRN || null;
window.studentsAnalyticsSearch = window.studentsAnalyticsSearch || '';

window.toggleStudentMgmtFilters = function () {
    const pop = document.getElementById('student-mgmt-filters-popover');
    if (pop) pop.classList.toggle('hidden');
};

window.filterStudentMgmtList = function (val) {
    window.studentsAnalyticsSearch = val.toLowerCase();
    const rows = document.querySelectorAll('.student-mgmt-row');
    rows.forEach(row => {
        const name = row.getAttribute('data-name');
        if (name.includes(window.studentsAnalyticsSearch)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
};

window.selectStudentMgmtProfile = function (lrn) {
    const sel = students.find(s => s.lrn === lrn);
    if (!sel) return;

    // Determine Level
    let gLevel = 'Unknown Level';
    const sName = (sel.section || '').toLowerCase();
    if (sName.match(/\b12\b/) || sName.startsWith('12')) gLevel = 'Grade 12';
    else if (sName.match(/\b11\b/) || sName.startsWith('11')) gLevel = 'Grade 11';
    else if (sName.match(/\b10\b/) || sName.startsWith('10')) gLevel = 'Grade 10';
    else if (sName.match(/\b9\b/) || sName.startsWith('9-')) gLevel = 'Grade 9';
    else if (sName.match(/\b8\b/) || sName.startsWith('8-')) gLevel = 'Grade 8';
    else if (sName.match(/\b7\b/) || sName.startsWith('7-')) gLevel = 'Grade 7';
    else {
        try {
            const savedSections = JSON.parse(localStorage.getItem('cnhs_sections') || '[]');
            const secData = savedSections.find(x => x.name.toLowerCase() === sName);
            if (secData && secData.year) {
                let m2 = secData.year.match(/\b([7-9]|1[0-2])\b/);
                if (m2) gLevel = 'Grade ' + m2[1];
            }
        } catch (e) { }
    }

    let advName = 'None';
    if (typeof teachers !== 'undefined') {
        const adv = teachers.find(t => t.is_adviser && (t.section || '').toLowerCase().includes(sName));
        if (adv) advName = adv.name;
    }

    const photo = sel.photo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(sel.name) + '&size=120&background=166534&color=fff';

    Swal.fire({
        html: `
            <div class="text-left relative overflow-hidden bg-white p-2">
                <div class="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
                    <i class="fas fa-user-graduate text-[150px]"></i>
                </div>
                <div class="flex flex-col md:flex-row gap-6 relative z-10 items-center md:items-start">
                    <img src="${photo}" class="w-24 h-24 rounded-2xl object-cover border-4 border-green-50 shadow-sm shrink-0">
                    <div class="flex-1 w-full">
                        <div class="flex justify-between items-start">
                            <div>
                                <h3 class="text-2xl font-black text-gray-800">${sel.name}</h3>
                                <p class="text-sm text-gray-500 font-bold mt-1">${sel.lrn} • ${sel.email || 'No email provided'}</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4 mt-6">
                            <div>
                                <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Level</p>
                                <p class="text-sm font-bold text-gray-800">${gLevel}</p>
                            </div>
                            <div>
                                <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Location</p>
                                <p class="text-sm font-bold text-gray-800"><i class="fas fa-map-marker-alt text-gray-300 mr-1"></i> ${sel.section || 'Unassigned'}</p>
                            </div>
                            <div>
                                <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Adviser</p>
                                <p class="text-sm font-bold text-gray-800 truncate">${advName}</p>
                            </div>
                            <div>
                                <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">General Average</p>
                                <p class="text-sm font-bold ${sel.gwa >= 90 ? 'text-yellow-600' : sel.gwa >= 75 ? 'text-green-600' : 'text-red-500'}">${sel.gwa > 0 ? sel.gwa.toFixed(2) : 'No Grades'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        customClass: {
            popup: 'rounded-3xl p-4'
        },
        width: '600px'
    });
};

function renderAdminStudentsAnalytics(container) {
    // 1. Determine all unique grades and sections
    function guessGradeFromSection(sec) {
        const s = (sec || '').toLowerCase();
        if (s.match(/\b12\b/) || s.startsWith('12')) return 'Grade 12';
        if (s.match(/\b11\b/) || s.startsWith('11')) return 'Grade 11';
        if (s.match(/\b10\b/) || s.startsWith('10')) return 'Grade 10';
        if (s.match(/\b9\b/) || s.startsWith('9-')) return 'Grade 9';
        if (s.match(/\b8\b/) || s.startsWith('8-')) return 'Grade 8';
        if (s.match(/\b7\b/) || s.startsWith('7-')) return 'Grade 7';

        try {
            const savedSections = JSON.parse(localStorage.getItem('cnhs_sections') || '[]');
            const secData = savedSections.find(x => x.name.toLowerCase() === s);
            if (secData && secData.year) {
                let m2 = secData.year.match(/\b([7-9]|1[0-2])\b/);
                if (m2) return 'Grade ' + m2[1];
            }
        } catch (e) { }

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
        if (s.section) {
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
    // 4. Render Table Rows
    const studentRowsHtml = filtered.sort((a, b) => a.name.localeCompare(b.name)).map(s => {
        const hasFailing = (s.grades && Object.values(s.grades).some(g => parseFloat(g) < 75)) || (s.subjects || []).some(x => x.g !== null && parseFloat(x.g) < 75) || (s.allSubjects || []).some(x => x.g !== null && parseFloat(x.g) < 75);
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
            } else if (s.gwa >= 75 && !hasFailing) {
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
        const rowClass = 'hover:bg-gray-50 cursor-pointer';

        return `
        <tr class="${rowClass} transition-colors student-mgmt-row" data-name="${s.name.toLowerCase()}" onclick="selectStudentMgmtProfile('${s.lrn}')">
            <td class="py-3 px-2 text-center" onclick="event.stopPropagation()">
                <input type="checkbox" class="rounded border-gray-300 accent-primary w-4 h-4 mt-1 cursor-pointer">
            </td>
            <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                    <img src="${s.photo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(s.name) + '&background=f3f4f6&color=6b7280'}" class="w-8 h-8 rounded-full object-cover">
                    <div>
                        <p class="font-bold text-gray-800 leading-tight">${s.name}</p>
                        <p class="text-[10px] text-gray-400">${s.lrn}</p>
                    </div>
                </div>
            </td>
            <td class="py-3 px-4 text-gray-600 font-medium">${s.section}</td>
            <td class="py-3 px-4 text-gray-600 font-medium">${guessGradeFromSection(s.section)}</td>
            <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                    <span class="w-16 px-2 py-0.5 rounded text-[10px] font-bold text-center ${statusColor} uppercase tracking-wider">${statusText}</span>
                    <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[80px]">
                        <div class="h-full ${barColor} rounded-full" style="width: ${progress}%"></div>
                    </div>
                    <span class="text-xs font-bold text-gray-600 w-8">${s.gwa > 0 ? s.gwa.toFixed(1) : '-'}</span>
                </div>
            </td>
            <td class="py-3 px-4 text-center">
                <button class="text-gray-400 hover:text-primary transition p-1"><i class="fas fa-ellipsis-v"></i></button>
            </td>
        </tr>`;
    }).join('');

    const tabBtns = `
        <div class="flex gap-1 bg-gray-100 rounded-2xl p-1 shrink-0">
            <button onclick="switchRecordsTab('teachers')" class="px-5 py-2 rounded-xl text-sm font-bold transition text-gray-500 hover:text-primary">
                <i class="fas fa-chalkboard-teacher mr-1.5"></i>Teachers
            </button>
            <button onclick="switchRecordsTab('advisory')" class="px-5 py-2 rounded-xl text-sm font-bold transition text-gray-500 hover:text-primary">
                <i class="fas fa-star mr-1.5"></i>Advisory
            </button>
            <button onclick="switchRecordsTab('students')" class="px-5 py-2 rounded-xl text-sm font-bold transition bg-white text-primary shadow-sm">
                <i class="fas fa-users mr-1.5"></i>Students
            </button>
        </div> `;

    container.innerHTML = `
    <div class="flex flex-col gap-6 animate-slide-up h-full pb-10">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 class="text-2xl font-black text-gray-800 tracking-tight">Student Management</h2>
                <p class="text-sm text-gray-400 font-medium mt-1">Manage your student information and view academic records.</p>
            </div>
            <div class="flex flex-col items-end gap-3">
                ${tabBtns}
            </div>
        </div>

        

        <!-- Student List Section -->
        <div class="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex-1 flex flex-col min-h-[500px]">
            <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 relative z-20">
                <div class="flex items-center gap-3">
                    <h3 class="text-lg font-black text-gray-800">Students</h3>
                    <span class="text-primary font-bold bg-green-50 px-2 py-0.5 rounded text-sm">${filtered.length}</span>
                </div>
                <div class="flex items-center gap-3 w-full lg:w-auto relative">
                    <div class="relative flex-1 lg:w-64">
                        <i class="fas fa-search absolute left-3 top-2.5 text-gray-400"></i>
                        <input type="text" id="student-mgmt-search" placeholder="Search Students..." value="${window.studentsAnalyticsSearch}" onkeyup="filterStudentMgmtList(this.value)" class="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 outline-none focus:border-primary transition bg-gray-50/50">
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
                                    ${allGrades.map(g => `<option value="${g}" ${window.studentsAnalyticsGrade === g ? 'selected' : ''}>${g}</option>`).join('')}
                                </select>
                            </div>
                            
                            <div class="mb-6">
                                <label class="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Location (Section)</label>
                                <select onchange="window.studentsAnalyticsSection = this.value;" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 outline-none focus:border-primary bg-gray-50/50">
                                    <option value="all">All Sections</option>
                                    ${allSections.map(s => `<option value="${s}" ${window.studentsAnalyticsSection === s ? 'selected' : ''}>${s}</option>`).join('')}
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
                        ${studentRowsHtml.length > 0 ? studentRowsHtml : '<tr><td colspan="6" class="text-center py-10 text-gray-400 font-bold italic">No students found matching the criteria.</td></tr>'}
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
    `;

    // Apply any active search filter after re-rendering
    if (window.studentsAnalyticsSearch) {
        filterStudentMgmtList(window.studentsAnalyticsSearch);
    }
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
function renderAdminAdvisoryList(container) {
    const search = adminTeacherSearch.toLowerCase();
    
    // Create a list of all advisory sections from teachers
    let advisorySections = [];
    teachers.forEach(t => {
        const sections = (t.section || '').split(',').map(s => s.trim()).filter(Boolean);
        sections.forEach(sec => {
            advisorySections.push({ sec, t });
        });
    });

    // Filter based on search
    let filtered = advisorySections.filter(item => {
        if (!search) return true;
        return (
            item.sec.toLowerCase().includes(search) ||
            item.t.name.toLowerCase().includes(search)
        );
    });

    let levelBtnsHtml = '';
    if (currentUser.role === 'curriculum_coordinator') {
        if (currentUser.department === 'JHS') {
            filtered = filtered.filter(item => (item.t.level || 'JH') === 'JH');
        } else if (currentUser.department === 'SHS') {
            filtered = filtered.filter(item => (item.t.level || 'JH') === 'SH');
        }
    } else {
        if (adminLevelFilter !== 'ALL') {
            filtered = filtered.filter(item => (item.t.level || 'JH') === adminLevelFilter);
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
                    <p class="text-sm text-gray-400 mt-1">Select an advisory section to view full student records.</p>
                </div>
                <div class="flex flex-col itemsp-2 w-full md:w-auto">
                    <!-- Teachers / Students Tab -->
                    <div class="flex gap-1 bg-gray-100 rounded-2xl p-1">
                        <button onclick="switchRecordsTab('teachers')" class="px-5 py-2 rounded-xl text-sm font-bold transition text-gray-500 hover:text-primary">
                            <i class="fas fa-chalkboard-teacher mr-1.5"></i>Teachers
                        </button>
                        <button onclick="switchRecordsTab('advisory')" class="px-5 py-2 rounded-xl text-sm font-bold transition bg-white text-primary shadow-sm">
                            <i class="fas fa-star mr-1.5"></i>Advisory
                        </button>
                        <button onclick="switchRecordsTab('students')" class="px-5 py-2 rounded-xl text-sm font-bold transition text-gray-500 hover:text-primary">
                            <i class="fas fa-users mr-1.5"></i>Students
                        </button>
                    </div>
                    <!-- Level filter pills -->
                    <div class="flex gap-2 flex-wrap">${levelBtnsHtml}</div>
                    <!-- Search bar -->
                    <div class="relative w-full md:w-72 mt-2">
                        <i class="fas fa-search absolute left-3 top-3 text-gray-400 text-sm"></i>
                        <input
                            id="advisory-search-input"
                            type="text"
                            value="${adminTeacherSearch}"
                            oninput="adminTeacherSearch = this.value; renderAdminAdvisoryList(document.getElementById('content-area'));"
                            placeholder="Search section, adviser..."
                            class="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-primary transition shadow-sm"
                        >
                    </div>
                </div>
            </div>
            
            ${filtered.length === 0 ? `
                <div class="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm mt-4">
                    <i class="fas fa-star text-5xl mb-4 opacity-30"></i>
                    <p class="font-semibold">No advisory sections found.</p>
                    <p class="text-xs mt-1">Try adjusting your search.</p>
                </div>
            ` : `
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    ${filtered.map(item => {
                        const sec = item.sec;
                        const t = item.t;
                        const ss = students.filter(s => s.section === sec);
                        const atRisk = ss.filter(s => (s.gwa > 0 && s.gwa < 75) || (s.subjects || []).some(x => x.g !== null && parseFloat(x.g) < 75) || (s.allSubjects || []).some(x => x.g !== null && parseFloat(x.g) < 75)).length;
                        const withGrades = ss.filter(s => s.gwa > 0).length;
                        const riskColor = atRisk > 0 ? 'text-red-500' : 'text-gray-400';
                        const initials = t.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

                        return `
                        <div onclick="adminSelectedTeacher = teachers.find(x => x.id === '${t.id}'); adminSelectedSection = '${sec}'; renderRecords(document.getElementById('content-area'));" 
                            class="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary/40 cursor-pointer transition-all duration-200 group h-full flex flex-col">
                            <div class="flex items-center gap-4 mb-4">
                                <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                    <i class="fas fa-star"></i>
                                </div>
                                <div class="overflow-hidden">
                                    <h3 class="font-bold text-gray-900 truncate group-hover:text-primary transition-colors">${sec}</h3>
                                    <div class="flex items-center gap-1 mt-0.5">
                                        <span class="text-[10px] text-gray-500 truncate"><i class="fas fa-user-tie mr-1"></i>${t.name}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-3 gap-2 bg-gray-50 rounded-xl p-3 mt-auto">
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
                        </div>`;
                    }).join('')}
                </div>
            `}
        </div>
    `;
    
    // Focus search input and preserve cursor if it exists
    setTimeout(() => {
        const input = document.getElementById('advisory-search-input');
        if (input && adminTeacherSearch) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        }
    }, 10);
}



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
        const atRisk = secStudents.filter(s => {
            return subjectList.some(subName => {
                const subData = (s.subjects || []).find(x => x.n === subName) || (s.allSubjects || []).find(x => x.n === subName);
                return subData && subData.g !== null && parseFloat(subData.g) < 75;
            });
        }).length;

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
    let visibleSubjects = [];
    if (subjectList.length > 0) {
        visibleSubjects = subjectList;
    } else {
        if (typeof getSubjectsForReport === 'function') {
            const isSHS = sec.toLowerCase().includes('grade 11') || sec.toLowerCase().includes('grade 12') || sec.toLowerCase().includes('gr 11') || sec.toLowerCase().includes('gr 12');
            const level = isSHS ? 'SH' : 'JH';
            let gradeNum = 7;
            if (typeof getStudentGradeNumber === 'function') {
                const sampleStudent = students.find(s => s.section === sec);
                gradeNum = getStudentGradeNumber(sampleStudent || { section: sec }) || 7;
            }
            visibleSubjects = getSubjectsForReport(level, null, gradeNum, window.currentRecordSemester || 1);
        }
        if (!visibleSubjects || visibleSubjects.length === 0) {
            let allSubs = [];
            students.filter(s => s.section === sec).forEach(s => {
                (s.subjects || []).forEach(sub => { if (!allSubs.includes(sub.n)) allSubs.push(sub.n); });
                (s.allSubjects || []).forEach(sub => { if (!allSubs.includes(sub.n)) allSubs.push(sub.n); });
            });
            visibleSubjects = allSubs.length > 0 ? allSubs : (typeof coreSubjects !== 'undefined' ? coreSubjects : []);
        }
    }

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
                            <option value="ALL" ${window.currentRecordQuarter === 'ALL' || !window.currentRecordQuarter ? 'selected' : ''}>All Terms</option>
                            ${(function () {
            let gpList = ['1', '2', '3', '4'];
            if (typeof globalSettings !== 'undefined' && globalSettings['grading_periods']) {
                try {
                    let parsed = JSON.parse(globalSettings['grading_periods']);
                    if (Array.isArray(parsed) && parsed.length > 0) gpList = parsed;
                } catch (e) { }
            }
            return gpList.map(gp => {
                let label = 'Term ' + gp;
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
                const hasFailing = visibleSubjects.some(subName => {
                    const subData = (s.subjects || []).find(x => x.n === subName) || (s.allSubjects || []).find(x => x.n === subName);
                    return subData && subData.g !== null && parseFloat(subData.g) < 75;
                });

                if (isSH) {
                    if (s.gwa >= 90 && !hasFailing) {
                        badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-700 font-bold">Academic Excellence Award</span>';
                    } else if (s.gwa >= 75 && !hasFailing) {
                        badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-green-100 text-green-600 font-bold">Regular</span>';
                    } else if (s.gwa > 0 || hasFailing) {
                        badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-600 font-bold">Failing</span>';
                    }
                } else {
                    if (s.gwa >= 98 && !hasFailing) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-700 font-bold">Highest Honor</span>';
                    else if (s.gwa >= 95 && !hasFailing) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 font-bold">High Honor</span>';
                    else if (s.gwa >= 90 && !hasFailing) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-bold">With Honor</span>';
                    else if (s.gwa >= 75 && !hasFailing) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-green-100 text-green-600 font-bold">Regular</span>';
                    else if (s.gwa > 0 || hasFailing) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-600 font-bold">Failing</span>';
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
    if (currentUser.role === 'teacher') {
        const allowed = Array.from(new Set([...(currentUser.handledSections || []), ...(typeof pinnedSections !== 'undefined' ? pinnedSections : [])]));
        if (allowed.length > 0) {
            teacherStudents = students.filter(s => allowed.includes(s.section));
        } else {
            teacherStudents = [];
        }
    }

    const rawSec = localStorage.getItem('cnhs_sections');
    const sectionsData = rawSec ? JSON.parse(rawSec) : [];
    const _getLabel = (name) => {
        const sObj = sectionsData.find(x => x.name === name);
        if (!sObj || !sObj.year) return name;
        const gNum = sObj.year.replace(/\D/g, '');
        return gNum ? `${gNum} - ${name}` : name;
    };
    let yearSectionsData = sectionsData.filter(s => !s.schoolYear || s.schoolYear === (window.currentRecordSchoolYear || '2025-2026'));
    
    if (currentUser.role === 'curriculum_coordinator') {
        if (currentUser.department === 'JHS') {
            yearSectionsData = yearSectionsData.filter(s => {
                const match = (s.year || s.name).match(/\b([7-9]|1[0-2])\b/);
                return match && parseInt(match[1]) <= 10;
            });
        } else if (currentUser.department === 'SHS') {
            yearSectionsData = yearSectionsData.filter(s => {
                const match = (s.year || s.name).match(/\b([7-9]|1[0-2])\b/);
                if (match && parseInt(match[1]) >= 11) {
                    if (currentUser.strand && s.strand !== currentUser.strand) return false;
                    return true;
                }
                return false;
            });
        }
    }
    
    const yearSections = yearSectionsData.map(s => s.name);

    const visiblePinnedSections = pinnedSections.filter(sec => yearSections.includes(sec) || sec === 'all');
    const unpinned = yearSections.filter(s => !visiblePinnedSections.includes(s));
    const teacherSubjects = currentUser.subject ? currentUser.subject.split(',').map(s => s.trim()) : [];
    const visibleSubjects = currentUser.role === 'teacher' ? teacherSubjects : resolveSubjectsForSection(currentRecordSection || 'All', teacherStudents);

    if (currentRecordSection === 'all' && currentUser.role === 'teacher') {
        currentRecordSection = visiblePinnedSections.length > 0 ? visiblePinnedSections[0] : (yearSections.length > 0 ? yearSections[0] : null);
    }

    let availableForSelect = Array.from(new Set([
        ...(currentUser.role === 'teacher' && currentUser.handledSections ? currentUser.handledSections : []),
        ...visiblePinnedSections
    ])).filter(s => s !== 'all');

    let dropdownOptions = '';
    if (currentUser.role === 'admin' || currentUser.role === 'curriculum_coordinator') {
        dropdownOptions += `<option value="all" ${currentRecordSection === 'all' ? 'selected' : ''}>All Sections</option>`;
    }

    availableForSelect.forEach(sec => {
        dropdownOptions += `<option value="${sec}" ${currentRecordSection === sec ? 'selected' : ''}>${_getLabel(sec)}</option>`;
    });

    const sectionDropdownHtml = `
        <div class="relative flex items-center bg-white border border-gray-200 rounded-xl shadow-sm hover:border-primary transition group overflow-hidden">
            <button onclick="promptAddViewSection()" title="Add a section to view" class="bg-primary/10 px-3 py-2 flex items-center justify-center border-r border-gray-100 hover:bg-primary transition cursor-pointer group/btn">
                <i class="fas fa-plus text-primary group-hover/btn:text-white transition text-xs"></i>
            </button>
            <select onchange="setPinnedSection(this.value)" class="text-xs font-bold text-gray-700 bg-transparent outline-none cursor-pointer pl-3 pr-[3.5rem] py-2 appearance-none w-48 truncate">
                ${dropdownOptions}
            </select>
            <i class="fas fa-chevron-down absolute right-10 text-[10px] text-gray-400 pointer-events-none group-hover:text-primary transition"></i>
            ${currentRecordSection && currentRecordSection !== 'all' ? `
            <button onclick="removePinnedSection('${currentRecordSection}')" title="Remove this section" class="bg-red-50 px-3 py-2 absolute right-0 top-0 bottom-0 flex items-center justify-center border-l border-gray-100 hover:bg-red-500 transition cursor-pointer group/btn-rm z-10">
                <i class="fas fa-trash-alt text-red-500 group-hover/btn-rm:text-white transition text-xs"></i>
            </button>
            ` : ''}
        </div>
    `;

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
                        ${[1, 2, 3].map(q => `
                            <button onclick="setRecordQuarter(${q})"
                                    class="px-3 py-1 rounded-full text-[10px] font-bold uppercase transition
                                           ${window.currentRecordQuarter === q
            ? 'bg-white text-primary shadow-sm'
            : 'text-gray-500 hover:bg-white/50 hover:text-gray-700'}">
                                Term ${q}
                            </button>
                        `).join('')}
                    </div>
                    ${false ? `
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
                    ${sectionDropdownHtml}
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
            const subjectList = subject.split(',').map(sub => sub.trim()).filter(Boolean);
            s.subjects = (s.subjects || []).filter(x => !subjectList.includes(x.n));
            const idx = -1;
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

window.promptAddViewSection = function () {
    const rawSec = localStorage.getItem('cnhs_sections');
    const sectionsData = rawSec ? JSON.parse(rawSec) : [];
    let yearSections = sectionsData.filter(s => !s.schoolYear || s.schoolYear === (window.currentRecordSchoolYear || '2025-2026'));

    const isSHSUser = currentUser.department === 'SHS' || currentUser.level === 'SH' || currentUser.strand;

    if (isSHSUser) {
        yearSections = yearSections.filter(s => {
            const match = (s.year || s.name).match(/\b([7-9]|1[0-2])\b/);
            if (match && parseInt(match[1]) >= 11) {
                // If the user has a specific strand, strictly require the section to have the SAME strand
                if (currentUser.strand) {
                    if (s.strand !== currentUser.strand) return false;
                }
                return true;
            }
            return false;
        });
    } else if (currentUser.department === 'JHS' || currentUser.level === 'JH') {
        yearSections = yearSections.filter(s => {
            const match = (s.year || s.name).match(/\b([7-9]|1[0-2])\b/);
            return match && parseInt(match[1]) <= 10;
        });
    }

    const yearSectionNames = yearSections.map(s => s.name);

    let availableForSelect = Array.from(new Set([
        ...(currentUser.role === 'teacher' && currentUser.handledSections ? currentUser.handledSections : []),
        ...pinnedSections
    ])).filter(s => s !== 'all');

    const unpinned = yearSectionNames.filter(s => !availableForSelect.includes(s));

    const getGrade = (secName) => {
        let match = secName.match(/\b([7-9]|1[0-2])\b/);
        if (match) return 'Grade ' + match[1];
        let sd = sectionsData.find(x => x.name === secName);
        if (sd && sd.year) {
            let m = sd.year.match(/\b([7-9]|1[0-2])\b/);
            if (m) return 'Grade ' + m[1];
        }
        return 'Unknown';
    };

    const allAvailableGrades = Array.from(new Set(unpinned.map(s => getGrade(s)).filter(g => g !== 'Unknown'))).sort((a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')));

    const overlay = document.createElement('div');
    overlay.id = 'add-view-sec-modal';
    overlay.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in';

    let listHTML = '';
    if (unpinned.length === 0) {
        listHTML = '<div class="p-6 text-center text-gray-400 italic text-sm">All sections are already added.</div>';
    } else {
        listHTML += unpinned.map(sec => `
            <div onclick="addPinnedSectionAndClose('${sec}')" data-grade="${getGrade(sec)}" class="view-section-option px-5 py-3.5 cursor-pointer hover:bg-primary/5 transition border-b border-gray-100 last:border-0 text-sm text-gray-700 font-medium flex justify-between items-center group">
                <span>${sec}</span><i class="fas fa-plus text-primary opacity-0 group-hover:opacity-100 transition"></i>
            </div>
        `).join('');
    }

    overlay.innerHTML = `
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-scale-up flex flex-col max-h-[90vh]">
            <div class="shrink-0 mb-5 flex justify-between items-start">
                <div>
                    <h3 class="text-xl font-bold text-gray-800 mb-1.5">Add Section to View</h3>
                    <p class="text-xs text-gray-400 leading-relaxed">Search or filter to find a section's record.</p>
                </div>
                <button onclick="document.getElementById('add-view-sec-modal').remove()" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition">
                    <i class="fas fa-times text-sm"></i>
                </button>
            </div>
            
            <div class="shrink-0 mb-4 flex gap-2">
                <div class="w-1/3 relative">
                    <select id="view-grade-filter" onchange="filterViewSections()" class="w-full pl-3 pr-8 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition appearance-none">
                        <option value="All">All Grades</option>
                        ${allAvailableGrades.map(g => `<option value="${g}">${g}</option>`).join('')}
                    </select>
                    <i class="fas fa-chevron-down absolute right-3 top-4 text-[10px] text-gray-400 pointer-events-none"></i>
                </div>
                <div class="w-2/3 relative">
                    <i class="fas fa-search absolute left-4 top-3.5 text-gray-400"></i>
                    <input type="text" id="search-view-section" placeholder="Search section..." class="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition" onkeyup="filterViewSections()">
                </div>
            </div>
            
            <div class="flex-1 overflow-y-auto mb-2 bg-white border border-gray-200 rounded-xl relative shadow-inner h-64 select-none">
                ${listHTML}
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    window.addPinnedSectionAndClose = function (sec) {
        if (sec && !pinnedSections.includes(sec)) {
            pinnedSections.push(sec);
            savePinnedSections();
        }
        currentRecordSection = sec;
        renderRecords(document.getElementById('content-area'));
        document.getElementById('add-view-sec-modal').remove();
    };

    window.filterViewSections = function () {
        const queryEl = document.getElementById('search-view-section');
        const filterEl = document.getElementById('view-grade-filter');
        if (!queryEl || !filterEl) return;
        const q = queryEl.value.toLowerCase();
        const f = filterEl.value;

        document.querySelectorAll('.view-section-option').forEach(el => {
            const text = el.innerText.toLowerCase();
            const g = el.getAttribute('data-grade');

            const matchQ = text.includes(q);
            const matchF = (f === 'All' || g === f);

            if (matchQ && matchF) {
                el.classList.remove('hidden');
                el.classList.add('flex');
            } else {
                el.classList.add('hidden');
                el.classList.remove('flex');
            }
        });
    };
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
    let yearSectionsData = sectionsData.filter(s => !s.schoolYear || s.schoolYear === (window.currentRecordSchoolYear || '2025-2026'));
    if (currentUser.role === 'curriculum_coordinator') {
        if (currentUser.department === 'JHS') {
            yearSectionsData = yearSectionsData.filter(s => {
                const match = (s.year || s.name).match(/\b([7-9]|1[0-2])\b/);
                return match && parseInt(match[1]) <= 10;
            });
        } else if (currentUser.department === 'SHS') {
            yearSectionsData = yearSectionsData.filter(s => {
                const match = (s.year || s.name).match(/\b([7-9]|1[0-2])\b/);
                if (match && parseInt(match[1]) >= 11) {
                    if (currentUser.strand && s.strand !== currentUser.strand) return false;
                    return true;
                }
                return false;
            });
        }
    }
    const yearSections = yearSectionsData.map(s => s.name);

    let visiblePinnedSections = pinnedSections.filter(sec => yearSections.includes(sec));
    
    // Admin/Coordinator viewing a specific section
    if (currentUser.role !== 'teacher' && typeof adminSelectedSection !== 'undefined' && adminSelectedSection) {
        visiblePinnedSections = [adminSelectedSection];
        currentRecordSection = adminSelectedSection;
    }

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

    let isSHS = true;

    // Check if the currently pinned sections indicate SHS
    if (visiblePinnedSections.length > 0) {
        const secName = visiblePinnedSections[0].toLowerCase();
        if (secName.includes('grade 11') || secName.includes('grade 12') || secName.includes('gr 11') || secName.includes('gr 12') || window.studentsAnalyticsLevel === 'SH') {
            isSHS = true;
        }
    }

    const quarterBtnsHtml = [1, 2, 3].map(q => `
            <button onclick="setRecordQuarter(${q})"
                class="px-3 py-1 rounded-full text-[10px] font-bold uppercase transition
                               ${(window.currentRecordQuarter || 1) === q
                ? 'bg-white text-primary shadow-sm'
                : 'text-white/80 hover:bg-white/20 hover:text-white'
            }">
                Term ${q}
            </button>`).join('');

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
                        ${currentUser.role === 'teacher' ? `
                        <button onclick="saveManualGrades()"
                                class="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-[10px] font-bold uppercase shadow-sm hover:bg-blue-600 transition">
                            <i class="fas fa-save mr-1"></i>Save Grades
                        </button>
                        <button onclick="openScanner('CLASS_RECORD')"
                                class="px-3 py-1.5 bg-accent text-white rounded-lg text-[10px] font-bold uppercase shadow-sm hover:bg-yellow-600 transition">
                            <i class="fas fa-camera mr-1"></i>Scan Record
                        </button>
                        ` : ''}
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
                                    <span class="cursor-pointer hover:underline tooltip-trigger flex items-center gap-1" title="Edit Grading Weights" onclick="openGradingWeightsModal('${subject}')">Examination - EX (${qaWeight}%) <i class="fas fa-edit text-[10px]"></i></span>
                                </div>
                            </th>
                            <th rowspan="2" class="bg-gray-200 static-cell border-l-2 border-gray-300 w-16">Initial Grade</th>
                            <th rowspan="2" class="bg-gray-300 static-cell border-l-2 border-gray-400 w-16 text-xs shadow-sm">Term Grade</th>
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

    const visibleSubjects = currentUser.role === 'teacher' ? (currentUser.subject ? currentUser.subject.split(',').map(s => s.trim()) : []) : resolveSubjectsForSection(currentRecordSection || 'All', students.filter(s => currentRecordSection === 'all' || s.section === currentRecordSection));

    let filtered = students;
    if (currentUser.role === 'teacher') {
        const allowed = Array.from(new Set([...(currentUser.handledSections || []), ...(typeof pinnedSections !== 'undefined' ? pinnedSections : [])]));
        if (allowed.length > 0) {
            filtered = filtered.filter(s => allowed.includes(s.section));
        } else {
            filtered = [];
        }
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

    const visibleSubjects = currentUser.role === 'teacher' ? (currentUser.subject ? currentUser.subject.split(',').map(s => s.trim()) : []) : resolveSubjectsForSection(currentRecordSection || 'All', students.filter(s => currentRecordSection === 'all' || s.section === currentRecordSection));

    const savePromises = [];
    let filtered = students;
    if (currentUser.role === 'teacher') {
        const allowed = Array.from(new Set([...(currentUser.handledSections || []), ...(typeof pinnedSections !== 'undefined' ? pinnedSections : [])]));
        if (allowed.length > 0) {
            filtered = filtered.filter(s => allowed.includes(s.section));
        } else {
            filtered = [];
        }
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
            if (typeof fetchedAttendanceSections !== 'undefined') fetchedAttendanceSections.delete(section);
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
            <div class="header" style="border-bottom: none; margin-bottom: 20px;">
                <div style="text-align: center; margin-bottom: 15px;">
                    <img src="/img/kagawaran ng education logo.png" style="height: 100px; display: inline-block; margin-bottom: 10px;" alt="DepEd Logo" onerror="this.style.display='none'">
                    <div style="font-family: 'Times New Roman', Times, serif; color: #000;">
                        <p style="margin: 0; font-size: 14px;">Republic of the Philippines</p>
                        <h3 style="margin: 5px 0; font-size: 24px; font-weight: bold;">Department of Education</h3>
                        <p style="margin: 0; font-size: 14px; font-weight: bold;">REGION VIII- EASTERN VISAYAS</p>
                        <p style="margin: 0; font-size: 14px; font-weight: bold;">SCHOOLS DIVISION OF EASTERN SAMAR</p>
                        <p style="margin: 0; font-size: 14px; font-weight: bold;">Can-avid national high school</p>
                    </div>
                </div>
                <p style="font-size: 16px; font-weight: bold; margin-top: 10px; color: #166534;">${title}</p>
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





