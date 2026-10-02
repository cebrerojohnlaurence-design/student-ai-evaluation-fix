/**
 * admin/dashboard.js — Dashboard page render functions
 */

let dashboardCharts = [];
let dashGradeLevel = 'All';
let dashSectionFilter = 'All';
let dashHasJHS = true;
let dashHasSHS = true;


function getStudentGradeNumber(s) {
    if (!s || !s.section) return null;
    let secName = s.section.toUpperCase();
    let m = secName.match(/\b([7-9]|1[0-2])\b/);
    if (m) return parseInt(m[1]);
    try {
        const savedSections = JSON.parse(((typeof globalSettings !== 'undefined' && globalSettings.cnhs_sections) ? globalSettings.cnhs_sections : localStorage.getItem('cnhs_sections')) || '[]');
        const secData = savedSections.find(x => x.name.toUpperCase() === secName);
        if (secData && secData.year) {
            let m2 = secData.year.match(/\b([7-9]|1[0-2])\b/);
            if (m2) return parseInt(m2[1]);
        }
    } catch (e) { }

    // Smart dictionary fallback based on CNHS naming conventions
    // Grade 7: Philosophers
    if (/(SOCRATES|PLATO|ARISTOTLE|PYTHAGORAS|CONFUCIUS|PHILOSOPHER)/.test(secName)) return 7;
    // Grade 8: Minerals/Elements
    if (/(COPPER|GOLD|SILVER|BRONZE|IRON|DIAMOND|EMERALD|JADE|MINERAL)/.test(secName)) return 8;
    // Grade 9: Planets/Space
    if (/(LUNA|EARTH|MARS|JUPITER|VENUS|SATURN|MERCURY|NEPTUNE|URANUS|PLANET)/.test(secName)) return 9;
    // Grade 10: Specific Sections
    if (/(SAGIP|MAHARLIKA|RIZAL|BONIFACIO|MABINI)/.test(secName)) return 10;

    if (typeof teachers !== 'undefined') {
        const adv = teachers.find(t => t.is_adviser && (t.section || '').split(',').map(x => x.trim().toUpperCase()).includes(secName));
        // Do not force all unknown JHS sections to Grade 7! Leave them as null if unknown.
        if (adv) return adv.level === 'SH' ? 11 : null;
    }
    return null;
}

window.globalDashGradeFilter = 'All';
window.globalDashSectionFilter = 'All';

function getBaseDashboardStudents() {

    let curr = students;

    if (currentUser.role === 'teacher') {
        const handled = currentUser.handledSections || [];
        if (handled.length === 0) return [];
        curr = curr.filter(s => handled.includes(s.section));
    } else if (currentUser.role === 'curriculum_coordinator') {
        if (currentUser.department === 'JHS') {
            curr = curr.filter(s => {
                if (!s.section) return !s.strand; // Show unassigned only if they don't have an SHS strand

                // 1. Direct Regex Match on Section Name
                const match = s.section.match(/\b([7-9]|1[0-2])\b/);
                if (match) {
                    return parseInt(match[1]) <= 10;
                }

                // 2. LocalStorage Registration Match
                try {
                    const savedSections = JSON.parse(((typeof globalSettings !== 'undefined' && globalSettings.cnhs_sections) ? globalSettings.cnhs_sections : localStorage.getItem('cnhs_sections')) || '[]');
                    const secData = savedSections.find(x => x.name === s.section);
                    if (secData && secData.year) {
                        const m = secData.year.match(/\b([7-9]|1[0-2])\b/);
                        if (m) {
                            return parseInt(m[1]) <= 10;
                        }
                    }
                } catch (e) { }

                // 3. Fallback to Teacher Adviser Check
                if (typeof teachers !== 'undefined') {
                    const adv = teachers.find(t => t.is_adviser && (t.section || '').split(',').map(x => x.trim().toLowerCase()).includes(s.section.toLowerCase()));
                    if (adv && adv.level === 'JH') return true;
                }
                
                return false;
            });
        } else if (currentUser.department === 'SHS') {
            curr = curr.filter(s => {
                let isSHSStudent = false;
                let belongsToStrand = true;

                if (!s.section) {
                    if (s.strand) {
                        isSHSStudent = true;
                        if (currentUser.strand && s.strand !== currentUser.strand) belongsToStrand = false;
                    } else {
                        // Unassigned student with NO strand. Do not show on strand-specific SHS dashboards.
                        if (currentUser.strand) belongsToStrand = false;
                        else isSHSStudent = true; // generic SHS coordinator
                    }
                } else {
                    // 1. Direct Regex Match
                    const match = s.section.match(/\b([7-9]|1[0-2])\b/);
                    if (match) {
                        if (parseInt(match[1]) >= 11) isSHSStudent = true;
                        else return false; // Explicitly JHS
                    } else {
                        // 2. LocalStorage Registration Match
                        let secData = null;
                        try {
                            const savedSections = JSON.parse(((typeof globalSettings !== 'undefined' && globalSettings.cnhs_sections) ? globalSettings.cnhs_sections : localStorage.getItem('cnhs_sections')) || '[]');
                            secData = savedSections.find(x => x.name === s.section);
                            if (secData && secData.year) {
                                const m = secData.year.match(/\b([7-9]|1[0-2])\b/);
                                if (m) {
                                    if (parseInt(m[1]) >= 11) isSHSStudent = true;
                                    else return false; // Explicitly JHS
                                }
                            }
                        } catch (e) { }

                        // 3. Fallback to Teacher Adviser Check
                        if (!isSHSStudent && typeof teachers !== 'undefined') {
                            const adv = teachers.find(t => t.is_adviser && (t.section || '').split(',').map(x => x.trim().toLowerCase()).includes(s.section.toLowerCase()));
                            if (adv && adv.level === 'SH') isSHSStudent = true;
                        }
                    }

                    let secData = null;
                    try {
                        const savedSections = JSON.parse(((typeof globalSettings !== 'undefined' && globalSettings.cnhs_sections) ? globalSettings.cnhs_sections : localStorage.getItem('cnhs_sections')) || '[]');
                        secData = savedSections.find(x => x.name === s.section);
                    } catch (e) {}

                    if (currentUser.strand) {
                        if (s.strand && s.strand !== currentUser.strand) belongsToStrand = false;
                        else if (secData && secData.strand && secData.strand !== currentUser.strand) belongsToStrand = false;
                    }
                }
                return isSHSStudent && belongsToStrand;
            });
        }
    }
    return curr;
}

function getFilteredDashboardStudents() {
    let curr = getBaseDashboardStudents();

    if (window.globalDashGradeFilter && window.globalDashGradeFilter !== 'All') {
        const check = parseInt(window.globalDashGradeFilter.replace('Grade ', ''));
        curr = curr.filter(s => getStudentGradeNumber(s) === check);
    }
    if (window.globalDashSectionFilter && window.globalDashSectionFilter !== 'All') {
        curr = curr.filter(s => s.section === window.globalDashSectionFilter);
    }

    return curr;
}

window.onGlobalDashFilterChange = function (el, type) {
    if (type === 'grade') {
        window.globalDashGradeFilter = el.value;
        window.globalDashSectionFilter = 'All'; // reset section if grade changes
    } else {
        window.globalDashSectionFilter = el.value;
    }
    renderDashboard(document.getElementById('content-area'));
};


let modalGradeLevel = 'All';
let modalSectionFilter = 'All';
let modalActiveMetric = 'total';

function updateDashGradeDropdown(selectId) {
    const gradeSelect = document.getElementById(selectId);
    if (!gradeSelect) return;

    let curr = getBaseDashboardStudents();

    const gradesSet = new Set();
    curr.forEach(s => {
        const gNum = getStudentGradeNumber(s);
        if (gNum) {
            gradesSet.add('Grade ' + gNum);
        }
    });

    const grades = Array.from(gradesSet).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numA - numB;
    });

    let html = `<option value="All">All Grades</option>`;
    grades.forEach(g => {
        html += `<option value="${g}">${g}</option>`;
    });

    if (grades.length === 0 && currentUser.role !== 'teacher') {
        let fallbackGrades = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
        if (currentUser.role === 'curriculum_coordinator') {
            if (currentUser.department === 'JHS') fallbackGrades = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
            else if (currentUser.department === 'SHS') fallbackGrades = ['Grade 11', 'Grade 12'];
        }
        fallbackGrades.forEach(g => {
            html += `<option value="${g}">${g}</option>`;
        });
    }
    gradeSelect.innerHTML = html;
}

function updateDashSectionDropdown(selectId) {
    const secSelect = document.getElementById(selectId);
    if (!secSelect) return;

    let curr = getBaseDashboardStudents();
    const gVal = window.globalDashGradeFilter;
    if (gVal !== 'All') {
        const check = parseInt(gVal.replace('Grade ', ''));
        curr = curr.filter(s => getStudentGradeNumber(s) === check);
    }

    let combinedSections = Array.from(new Set(curr.map(s => s.section))).filter(Boolean).sort();

    let html = '<option value="All">All Sections</option>';
    combinedSections.forEach(sec => {
        html += `<option value="${sec}">${sec}</option>`;
    });

    secSelect.innerHTML = html;
}

function updateModalGradeDropdown() {
    const gradeSelect = document.getElementById('modal-grade-select');
    if (!gradeSelect) return;

    let curr = getFilteredDashboardStudents();

    const gradesSet = new Set();

    let savedSections = [];
    try {
        savedSections = JSON.parse(((typeof globalSettings !== 'undefined' && globalSettings.cnhs_sections) ? globalSettings.cnhs_sections : localStorage.getItem('cnhs_sections')) || '[]');
    } catch (e) { }

    curr.forEach(s => {
        if (s.section) {
            let m = s.section.match(/\b([7-9]|1[0-2])\b/);
            if (m) {
                gradesSet.add('Grade ' + m[1]);
            } else {
                const secData = savedSections.find(x => x.name === s.section);
                if (secData && secData.year) {
                    let m2 = secData.year.match(/\b([7-9]|1[0-2])\b/);
                    if (m2) gradesSet.add('Grade ' + m2[1]);
                }
            }
        }
    });

    const grades = Array.from(gradesSet).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numA - numB;
    });

    let html = `<option value="All">All Grades</option>`;
    grades.forEach(g => {
        const isSelected = (modalGradeLevel === g) ? 'selected' : '';
        html += `<option value="${g}" ${isSelected}>${g}</option>`;
    });

    if (grades.length === 0 && currentUser.role !== 'teacher') {
        let fallbackGrades = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
        if (currentUser.role === 'curriculum_coordinator') {
            if (currentUser.department === 'JHS') fallbackGrades = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
            else if (currentUser.department === 'SHS') fallbackGrades = ['Grade 11', 'Grade 12'];
        }
        fallbackGrades.forEach(g => {
            const isSelected = (modalGradeLevel === g) ? 'selected' : '';
            html += `<option value="${g}" ${isSelected}>${g}</option>`;
        });
    }

    gradeSelect.innerHTML = html;
}

function updateModalSectionDropdown() {
    const secSelect = document.getElementById('modal-section-select');
    if (!secSelect) return;

    let curr = getFilteredDashboardStudents();

    let savedSections = [];
    try {
        savedSections = JSON.parse(((typeof globalSettings !== 'undefined' && globalSettings.cnhs_sections) ? globalSettings.cnhs_sections : localStorage.getItem('cnhs_sections')) || '[]');
    } catch (e) { }

    if (modalGradeLevel !== 'All') {
        const check = modalGradeLevel.replace('Grade ', '');
        curr = curr.filter(s => {
            const m = (s.section || '').match(/\b([7-9]|1[0-2])\b/);
            if (m && m[1] === check) return true;

            const secData = savedSections.find(x => x.name === s.section);
            if (secData && secData.year) {
                const m2 = secData.year.match(/\b([7-9]|1[0-2])\b/);
                if (m2 && m2[1] === check) return true;
            }
            return false;
        });
    }

    const sections = Array.from(new Set(curr.map(s => s.section))).filter(Boolean).sort();

    let html = `<option value="All">All Sections</option>`;
    sections.forEach(sec => {
        html += `<option value="${sec}" ${modalSectionFilter === sec ? 'selected' : ''}>${sec}</option>`;
    });
    secSelect.innerHTML = html;
}

function onModalGradeChange(val) {
    modalGradeLevel = val;
    modalSectionFilter = 'All';
    updateModalSectionDropdown();
    renderDrilldownTable();
}

function onModalSectionChange(val) {
    modalSectionFilter = val;
    renderDrilldownTable();
}

function openDrilldownModal(metric) {
    modalActiveMetric = metric;
    modalGradeLevel = 'All';
    modalSectionFilter = 'All';

    const titles = {
        'total': 'Total Students',
        'attendance': 'Average Attendance',
        'risk': 'At-Risk Students',
        'eval': 'Evaluation Done',
        'enrollment': 'Enrollment by Grade',
        'distribution': 'Grade Distribution',
        'performance': 'Section Performance'
    };
    const titleEl = document.getElementById('drilldown-modal-title');
    if (titleEl) titleEl.innerText = titles[metric] || 'Students';

    updateModalGradeDropdown();
    updateModalSectionDropdown();
    renderDrilldownTable();

    const modal = document.getElementById('dash-drilldown-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeDrilldownModal() {
    const modal = document.getElementById('dash-drilldown-modal');
    if (modal) modal.classList.add('hidden');
}

function renderDashboard(area) {
    if (!area) area = document.getElementById('content-area');
    if (!area) return;
    dashHasJHS = false;
    dashHasSHS = false;
    let curr = students;

    if (currentUser.role === 'teacher') {
        const handled = currentUser.handledSections || [];

        // If teacher has NO assigned or pinned sections yet, show an empty-state prompt
        if (handled.length === 0) {
            area.innerHTML = `
                <div class="flex flex-col items-center justify-center h-[60vh] gap-6 animate-fade-in">
                    <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 max-w-md w-full text-center">
                        <div class="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
                            <i class="fas fa-chalkboard-teacher text-primary text-3xl"></i>
                        </div>
                        <h2 class="text-xl font-bold text-gray-800 mb-2">No Sections Assigned</h2>
                        <p class="text-sm text-gray-500 mb-6">
                            You have not been assigned to any section yet.
                            Please contact your administrator or go to
                            <strong>Grading Records</strong> and use the
                            <strong>+ button</strong> to add your section.
                        </p>
                        <button onclick="navigate('records')"
                            class="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primaryDark transition shadow">
                            <i class="fas fa-plus mr-2"></i>Go to Grading Records
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        curr = curr.filter(s => handled.includes(s.section));
        handled.forEach(sec => {
            if (sec) {
                const match = sec.match(/\b([7-9]|1[0-2])\b/);
                if (match) {
                    const g = parseInt(match[1]);
                    if (g <= 10) dashHasJHS = true;
                    if (g >= 11) dashHasSHS = true;
                }
            }
        });
        if (!dashHasJHS && !dashHasSHS) dashHasJHS = true;
    } else if (currentUser.role === 'curriculum_coordinator') {
        if (currentUser.department === 'JHS') {
            // jhs curriculum coordinator dashboard
            dashHasJHS = true;
            dashHasSHS = false;
        } else if (currentUser.department === 'SHS') {
            // techpro / academic curriculum coordinator dashbooard
            dashHasJHS = false;
            dashHasSHS = true;
        }
    } else {
        // principal dashboard
        dashHasJHS = true;
        dashHasSHS = true;
    }

    const filteredStudents = getFilteredDashboardStudents();

    const evaluated = filteredStudents.filter(s => s.subjects && s.subjects.filter(sub => sub.g !== null).length >= 8).length;
    // At-Risk: overall GWA < 75 or any subject grade < 75
    const atRisk = filteredStudents.filter(s => {
        let hasFailingSubject = false;
        if (s.subjects) {
            hasFailingSubject = s.subjects.some(sub => parseFloat(sub.g) < 75);
        }
        return (s.gwa > 0 && s.gwa < 75) || hasFailingSubject;
    }).length;
    const avgAttendance = filteredStudents.length > 0 ? Math.round(filteredStudents.reduce((a, b) => a + b.attendance, 0) / filteredStudents.length) : 0;

    area.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 animate-fade-in">
            <h2 class="text-2xl font-bold text-gray-800 tracking-tight">Overview</h2>
        </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-fade-in">
            <div onclick="openDrilldownModal('total')" class="stat-card bg-white p-6 rounded-2xl shadow-sm border-b-4 border-primary cursor-pointer hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all duration-300">
                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Students</p>
                <h3 class="text-3xl font-bold text-gray-800">${filteredStudents.length}</h3>
            </div>
            <div onclick="openDrilldownModal('attendance')" class="stat-card bg-white p-6 rounded-2xl shadow-sm border-b-4 border-blue-500 cursor-pointer hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all duration-300">
                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg Attendance</p>
                <h3 class="text-3xl font-bold text-gray-800">${avgAttendance}%</h3>
            </div>
            <div onclick="openDrilldownModal('risk')" class="stat-card bg-white p-6 rounded-2xl shadow-sm border-b-4 border-red-500 cursor-pointer hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all duration-300">
                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">At-Risk Student</p>
                <h3 class="text-3xl font-bold text-red-600">${atRisk}</h3>
            </div>
            <div onclick="openDrilldownModal('eval')" class="stat-card bg-white p-6 rounded-2xl shadow-sm border-b-4 border-accent cursor-pointer hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all duration-300">
                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Evaluation Done</p>
                <h3 class="text-3xl font-bold text-gray-800">${evaluated}</h3>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-slide-up" style="animation-delay: 0.1s;">
            <!-- Chart 1: Enrollment by Section (left) -->
            <div onclick="openEnrollmentModal()" class="bg-gradient-to-br from-white to-blue-50 p-6 rounded-3xl shadow-sm border border-blue-100 flex flex-col cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                <div class="absolute -right-8 -top-8 w-36 h-36 bg-blue-200 rounded-full blur-3xl opacity-30"></div>
                <h3 class="text-xs font-bold text-blue-800 mb-4 uppercase tracking-widest relative z-10"><i class="fas fa-users text-blue-500 mr-2"></i>Enrollment by Section</h3>
                <div class="flex-1 relative z-10" style="min-height: 180px;">
                    <canvas id="enrollmentChart"></canvas>
                </div>
            </div>

            <!-- Chart 2: Section Average GWA (center) -->
            <div onclick="openSectionAverageModal()" class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative cursor-pointer group">
                <div class="absolute -right-8 -top-8 w-36 h-36 bg-green-200 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition"></div>
                <h3 class="text-xs font-bold text-gray-800 mb-4 uppercase tracking-widest relative z-10"><i class="fas fa-chart-bar text-green-500 mr-2"></i>Section Average (GWA)</h3>
                <div class="flex-1 relative min-h-[180px] z-10">
                    <canvas id="sectionPerformanceChart"></canvas>
                </div>
            </div>

            <!-- Chart 3: Grade Distribution (right) -->
            <div onclick="openGradeDistributionModal()" class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative">
                <h3 class="text-xs font-bold text-gray-800 mb-4 uppercase tracking-widest"><i class="fas fa-chart-pie text-accent mr-2"></i>Grade Distribution</h3>
                <div class="flex-1 relative min-h-[180px]">
                    <canvas id="gradeDistributionChart"></canvas>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 mb-8 animate-slide-up">
            <!-- AI Insights Panel -->
            <div class="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-l-primary flex flex-col relative overflow-hidden">
                <div class="absolute -right-6 -top-6 text-primary opacity-5">
                    <i class="fas fa-robot text-9xl"></i>
                </div>
                <div class="flex justify-between items-center mb-4 relative z-10 w-full gap-2">
                    <h3 class="text-xs font-bold text-gray-800 uppercase tracking-widest"><i class="fas fa-brain text-primary mr-2"></i>AI Insight</h3>
                    <div class="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-100">
                        <i class="fas fa-filter text-gray-400 text-[10px] ml-1"></i>
                        <select id="global-dash-grade" onchange="onGlobalDashFilterChange(this, 'grade')" class="text-[10px] bg-transparent outline-none pr-2 py-1 font-bold text-gray-600 cursor-pointer">
                            <option value="All">All Grades</option>
                        </select>
                        <select id="global-dash-section" onchange="onGlobalDashFilterChange(this, 'section')" class="text-[10px] bg-white border border-gray-200 outline-none px-2 py-1 rounded shadow-sm font-bold text-gray-600 cursor-pointer">
                            <option value="All">All Sections</option>
                        </select>
                    </div>
                    <button onclick="generateDashboardInsights()" id="btn-generate-insights" class="text-[10px] bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primaryDark transition shadow flex items-center gap-1 shrink-0">
                        <i class="fas fa-magic"></i> Analyze
                    </button>
                </div>
                <div id="ai-insights-content" class="flex-1 text-xs text-gray-600 relative z-10 bg-gray-50 rounded-xl p-4 border border-gray-100 italic flex items-center justify-start min-h-[60px]">
                    Click "Analyze" to generate an executive AI summary of current student performance.
                </div>
            </div>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-slide-up">
            <div class="p-6 border-b flex flex-col xl:flex-row justify-between items-center gap-4 bg-gray-50/50">
                <div class="flex flex-wrap gap-2 justify-center">
                    ${dashHasJHS ? `
                    <button onclick="setFilter('highest')" id="btn-highest" class="filter-btn px-4 py-1.5 rounded-full text-[10px] font-bold border hover:bg-primary hover:text-white transition whitespace-nowrap">HIGHEST HONOR (JHS)</button>
                    <button onclick="setFilter('high')" id="btn-high" class="filter-btn px-4 py-1.5 rounded-full text-[10px] font-bold border hover:bg-primary hover:text-white transition whitespace-nowrap">HIGH HONOR (JHS)</button>
                    <button onclick="setFilter('with')" id="btn-with" class="filter-btn px-4 py-1.5 rounded-full text-[10px] font-bold border hover:bg-primary hover:text-white transition whitespace-nowrap">WITH HONOR (JHS)</button>
                    ` : ''}
                    ${dashHasSHS ? `
                    <button onclick="setFilter('academic_excellence')" id="btn-academic_excellence" class="filter-btn px-4 py-1.5 rounded-full text-[10px] font-bold border hover:bg-primary hover:text-white transition whitespace-nowrap">ACADEMIC EXCELLENCE (SHS)</button>
                    ` : ''}
                    <button onclick="setFilter('total')" id="btn-total" class="filter-btn px-4 py-1.5 rounded-full text-[10px] font-bold border bg-gray-200 whitespace-nowrap">CLEAR ALL</button>
                </div>
                <div class="relative w-full xl:w-64">
                    <i class="fas fa-search absolute left-3 top-2.5 text-gray-300 text-xs"></i>
                    <input type="text" onkeyup="searchTable(this.value)" placeholder="Search LRN or Name..." class="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-primary transition">
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-white text-gray-400 uppercase font-bold border-b">
                        <tr>
                            <th class="px-6 py-4">LRN</th>
                            <th class="px-6 py-4">Full Name</th>
                            <th class="px-6 py-4">Section</th>
                            <th class="px-6 py-4 hidden xl:table-cell">Adviser</th>
                            <th class="px-6 py-4">GWA</th>
                            <th class="px-6 py-4">Attendance</th>
                            <th class="px-6 py-4">Classification</th>
                            <th class="px-6 py-4">Action</th>
                        </tr>
                    </thead>
                    <tbody id="dash-table-body" class="divide-y divide-gray-50"></tbody>
                </table>
            </div>
            </div>
        </div>

        
        <!-- Enrollment Modal -->
        <div id="dash-enrollment-modal" class="hidden fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-scale-up">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-50/50">
                    <h3 class="text-xl font-bold text-blue-800"><i class="fas fa-users mr-2"></i>Enrollment by Grade/Section</h3>
                    <button onclick="document.getElementById('dash-enrollment-modal').classList.add('hidden')" class="text-gray-400 hover:text-red-500 transition"><i class="fas fa-times text-xl"></i></button>
                </div>
                <div class="p-4 border-b flex gap-4 bg-white">
                    <select id="enroll-grade-select" onchange="updateEnrollSectionDropdown()" class="text-sm bg-white border border-gray-200 outline-none px-4 py-2 rounded-lg font-bold text-gray-600 shadow-sm"></select>
                    <select id="enroll-section-select" onchange="renderEnrollTable()" class="text-sm bg-white border border-gray-200 outline-none px-4 py-2 rounded-lg font-bold text-gray-600 shadow-sm"></select>
                </div>
                <div class="flex-1 overflow-y-auto p-0 bg-gray-50/30">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-gray-50 text-gray-400 uppercase font-bold sticky top-0 border-b z-10">
                            <tr>
                                <th class="px-6 py-4">LRN</th>
                                <th class="px-6 py-4">Full Name</th>
                                <th class="px-6 py-4">Section</th>
                                <th class="px-6 py-4">Adviser</th>
                            </tr>
                        </thead>
                        <tbody id="enroll-table-body" class="divide-y divide-gray-50 bg-white"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Grade Distribution Modal -->
        <div id="dash-distribution-modal" class="hidden fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-scale-up">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-purple-50/50">
                    <h3 class="text-xl font-bold text-purple-800"><i class="fas fa-chart-pie mr-2"></i>Grade Distribution Filtering</h3>
                    <button onclick="document.getElementById('dash-distribution-modal').classList.add('hidden')" class="text-gray-400 hover:text-red-500 transition"><i class="fas fa-times text-xl"></i></button>
                </div>
                <div class="p-4 border-b flex flex-wrap gap-4 bg-white">
                    <select id="dist-level-select" onchange="onDistLevelChange()" class="text-sm bg-white border border-gray-200 outline-none px-4 py-2 rounded-lg font-bold text-gray-600 shadow-sm"></select>
                    <select id="dist-section-select" onchange="renderDistTable()" class="text-sm bg-white border border-gray-200 outline-none px-4 py-2 rounded-lg font-bold text-gray-600 shadow-sm"></select>
                    <select id="dist-honor-select" onchange="renderDistTable()" class="text-sm bg-white border border-gray-200 outline-none px-4 py-2 rounded-lg font-bold text-gray-600 shadow-sm"></select>
                </div>
                <div class="flex-1 overflow-y-auto p-0 bg-gray-50/30">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-gray-50 text-gray-400 uppercase font-bold sticky top-0 border-b z-10">
                            <tr>
                                <th class="px-6 py-4">LRN</th>
                                <th class="px-6 py-4">Full Name</th>
                                <th class="px-6 py-4">Section</th>
                                <th class="px-6 py-4">GWA</th>
                                <th class="px-6 py-4">Classification</th>
                            </tr>
                        </thead>
                        <tbody id="dist-table-body" class="divide-y divide-gray-50 bg-white"></tbody>
                    </table>
                </div>
            </div>
        </div>

        
        <!-- Section Average Modal -->
        <div id="dash-section-avg-modal" class="hidden fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-scale-up">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-green-50/50">
                    <h3 class="text-xl font-bold text-green-800"><i class="fas fa-trophy mr-2 text-green-500"></i>Section Leaderboard</h3>
                    <button onclick="document.getElementById('dash-section-avg-modal').classList.add('hidden')" class="text-gray-400 hover:text-red-500 transition"><i class="fas fa-times text-xl"></i></button>
                </div>
                <div class="p-4 border-b flex gap-4 bg-white">
                    <select id="section-avg-grade-select" onchange="onSecAvgGradeChange()" class="text-sm bg-white border border-gray-200 outline-none px-4 py-2 rounded-lg font-bold text-gray-600 shadow-sm"></select>
                    <select id="section-avg-section-select" onchange="renderSectionAverageModal()" class="text-sm bg-white border border-gray-200 outline-none px-4 py-2 rounded-lg font-bold text-gray-600 shadow-sm"></select>
                </div>
                
                <!-- AI Section Insight -->
                <div id="section-avg-ai-insight" class="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 p-5 flex items-center gap-4">
                     <i class="fas fa-robot text-3xl text-green-500 opacity-80 shadow-sm rounded-full bg-white p-2 border border-green-100"></i>
                     <p class="text-sm text-green-800 leading-relaxed italic" id="section-avg-insight-text">Analyzing section performance...</p>
                </div>

                <div class="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="section-avg-grid">
                        <!-- Populated by JS -->
                    </div>
                </div>
            </div>
        </div>

        <!-- Drilldown Modal -->
        <div id="dash-drilldown-modal" class="hidden fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-scale-up">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 id="drilldown-modal-title" class="text-xl font-bold text-gray-800">Students</h3>
                    <button onclick="closeDrilldownModal()" class="text-gray-400 hover:text-red-500 transition"><i class="fas fa-times text-xl"></i></button>
                </div>
                <div class="p-4 border-b flex gap-4 bg-white">
                    <select id="modal-grade-select" onchange="onModalGradeChange(this.value)" class="text-sm bg-white border border-gray-200 outline-none px-4 py-2 rounded-lg font-bold text-gray-600 shadow-sm"></select>
                    <select id="modal-section-select" onchange="onModalSectionChange(this.value)" class="text-sm bg-white border border-gray-200 outline-none px-4 py-2 rounded-lg font-bold text-gray-600 shadow-sm"></select>
                </div>
                <div id="modal-content-container" class="flex-1 overflow-y-auto p-0 bg-gray-50/30">
                    <table class="w-full text-left text-xs" id="default-modal-table">
                        <thead class="bg-gray-50 text-gray-400 uppercase font-bold sticky top-0 border-b z-10">
                            <tr>
                                <th class="px-6 py-4">LRN</th>
                                <th class="px-6 py-4">Full Name</th>
                                <th class="px-6 py-4">Section</th>
                                <th class="px-6 py-4">GWA</th>
                                <th class="px-6 py-4">Attendance</th>
                                <th class="px-6 py-4">Classification</th>
                            </tr>
                        </thead>
                        <tbody id="modal-table-body" class="divide-y divide-gray-50 bg-white"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    updateDashGradeDropdown('global-dash-grade');
    updateDashSectionDropdown('global-dash-section');

    const gSel = document.getElementById('global-dash-grade');
    const sSel = document.getElementById('global-dash-section');
    if (gSel) gSel.value = window.globalDashGradeFilter;
    if (sSel) sSel.value = window.globalDashSectionFilter;
    refreshTable();
    initDashboardCharts();
}

function initDashboardCharts() {
    dashboardCharts.forEach(c => c.destroy());
    dashboardCharts = [];

    const filteredStudents = getFilteredDashboardStudents();

    // Determine role context for chart rendering
    const isJHSCoord = currentUser.role === 'curriculum_coordinator' && currentUser.department === 'JHS';
    const isSHSCoord = currentUser.role === 'curriculum_coordinator' && currentUser.department === 'SHS';
    dashHasJHS = !isSHSCoord;  // admin or JHS coord shows JHS honors
    dashHasSHS = !isJHSCoord;  // admin or SHS coord shows SHS honors

    // Helper: resolve whether a section belongs to SHS via adviser teacher lookup
    function resolveSectionIsSH(s) {
        if (!s.section) return isSHSCoord; // fall back to coordinator type
        // Check grade number embedded in section name
        const numMatch = s.section.match(/\b([7-9]|1[0-2])\b/);
        if (numMatch) return parseInt(numMatch[1]) >= 11;
        // Look up adviser teacher
        if (typeof teachers !== 'undefined') {
            const adv = teachers.find(t =>
                t.is_adviser &&
                (t.section || '').split(',').map(x => x.trim().toLowerCase()).includes(s.section.toLowerCase())
            );
            if (adv) return adv.level === 'SH';
        }
        // Fall back to coordinator department
        return isSHSCoord;
    }

    // 1. Calculate Grade Distribution — role-aware (JHS vs SHS honors)
    let highest = 0, high = 0, withHonor = 0, academicExcellence = 0, regular = 0, failing = 0, noGrades = 0;
    filteredStudents.forEach(s => {
        if (s.gwa === 0 || !s.gwa) { noGrades++; return; }
        const isSH = resolveSectionIsSH(s);
        const hasFailing = s.subjects && s.subjects.some(sub => parseFloat(sub.g) < 75);

        if (isSH) {
            if (s.gwa >= 90 && !hasFailing) academicExcellence++;
            else if (s.gwa >= 75) regular++;
            else failing++;
        } else {
            if (s.gwa >= 98 && !hasFailing) highest++;
            else if (s.gwa >= 95 && !hasFailing) high++;
            else if (s.gwa >= 90 && !hasFailing) withHonor++;
            else if (s.gwa >= 75) regular++;
            else failing++;
        }
    });

    const distCtx = document.getElementById('gradeDistributionChart');
    if (distCtx) {
        const chartLabels = [];
        const chartData = [];
        const chartBg = [];
        const chartBorder = [];

        // JHS honors — only for JHS coordinator or admin
        if (dashHasJHS) {
            if (highest > 0) { chartLabels.push('Highest Honor'); chartData.push(highest); chartBg.push('#fef08a'); chartBorder.push('#eab308'); }
            if (high > 0) { chartLabels.push('High Honor'); chartData.push(high); chartBg.push('#e9d5ff'); chartBorder.push('#a855f7'); }
            if (withHonor > 0) { chartLabels.push('With Honor'); chartData.push(withHonor); chartBg.push('#bfdbfe'); chartBorder.push('#3b82f6'); }
        }

        // SHS honors — only for SHS coordinator or admin
        if (dashHasSHS) {
            if (academicExcellence > 0) { chartLabels.push('Academic Excellence'); chartData.push(academicExcellence); chartBg.push('#a7f3d0'); chartBorder.push('#10b981'); }
        }

        // Common categories — always show if > 0
        if (regular > 0) { chartLabels.push('Regular'); chartData.push(regular); chartBg.push('#f3f4f6'); chartBorder.push('#9ca3af'); }
        if (failing > 0) { chartLabels.push('Failing'); chartData.push(failing); chartBg.push('#fecaca'); chartBorder.push('#ef4444'); }
        if (noGrades > 0) { chartLabels.push('No Grades'); chartData.push(noGrades); chartBg.push('#e5e7eb'); chartBorder.push('#d1d5db'); }

        // Fallback if everything is 0
        if (chartData.length === 0) {
            chartLabels.push('No Data');
            chartData.push(1);
            chartBg.push('#f3f4f6');
            chartBorder.push('#9ca3af');
        }

        dashboardCharts.push(new Chart(distCtx, {
            type: 'doughnut',
            data: {
                labels: chartLabels,
                datasets: [{
                    data: chartData,
                    backgroundColor: chartBg,
                    borderColor: chartBorder,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10, family: "'Inter', sans-serif" }, usePointStyle: true } },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.9)',
                        padding: 12,
                        titleFont: { size: 13, weight: 'bold' },
                        bodyFont: { size: 12 },
                        cornerRadius: 8,
                        displayColors: true
                    }
                },
                animation: { animateScale: true, animateRotate: true, duration: 1500, easing: 'easeOutBounce' },
                hover: { mode: 'index', intersect: false }
            }
        }));
    }

    // 2. Section Performance (Average GWA)
    const sections = {};
    filteredStudents.forEach(s => {
        if (!s.section || s.section === 'null' || s.section.trim() === '') return;
        if (!sections[s.section]) sections[s.section] = { sum: 0, count: 0 };
        if (s.gwa > 0) {
            sections[s.section].sum += parseFloat(s.gwa);
            sections[s.section].count++;
        }
    });

    const secLabels = [];
    const secData = [];
    for (const [sec, data] of Object.entries(sections)) {
        secLabels.push(sec || 'Unassigned');
        secData.push(data.count > 0 ? (data.sum / data.count).toFixed(2) : 0);
    }

    const perfCtx = document.getElementById('sectionPerformanceChart');
    if (perfCtx) {
        const ctx2d = perfCtx.getContext('2d');
        const gradient = ctx2d.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, '#10b981');
        gradient.addColorStop(1, '#064e3b');

        dashboardCharts.push(new Chart(perfCtx, {
            type: 'bar',
            data: {
                labels: secLabels,
                datasets: [{
                    label: 'Average GWA',
                    data: secData,
                    backgroundColor: gradient,
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.9)',
                        padding: 12,
                        titleFont: { size: 13, weight: 'bold' },
                        bodyFont: { size: 12 },
                        cornerRadius: 8,
                        displayColors: false
                    }
                },
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10, family: "'Inter', sans-serif" }, color: '#64748b' } },
                    y: { border: { dash: [4, 4] }, grid: { color: '#f1f5f9' }, beginAtZero: true, min: 0, max: 100, ticks: { font: { size: 10, family: "'Inter', sans-serif" }, color: '#64748b', stepSize: 20 } }
                },
                animation: { duration: 1200, easing: 'easeOutQuart' }
            }
        }));
    }

    // 3. Enrollment Chart — resolves grade from section name OR adviser level
    const enrollCtx = document.getElementById('enrollmentChart');
    if (enrollCtx) {
        let gradesCount = {};
        filteredStudents.forEach(s => {
            if (!s.section || s.section === 'null' || s.section.trim() === '') return;
            gradesCount[s.section] = (gradesCount[s.section] || 0) + 1;
        });

        let labels = Object.keys(gradesCount).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, '')) || 9999;
            const numB = parseInt(b.replace(/\D/g, '')) || 9999;
            return numA - numB;
        });
        let data = labels.map(l => gradesCount[l]);

        if (labels.length === 0) {
            labels = ['No Data'];
            data = [0];
        }

        const enrollCtx2d = enrollCtx.getContext('2d');

        // Build color palette per bar
        const barColors = labels.map((_, i) => {
            const palette = [
                'rgba(59,130,246,0.8)', 'rgba(16,185,129,0.8)', 'rgba(139,92,246,0.8)',
                'rgba(245,158,11,0.8)', 'rgba(239,68,68,0.8)', 'rgba(20,184,166,0.8)',
                'rgba(249,115,22,0.8)', 'rgba(99,102,241,0.8)'
            ];
            return palette[i % palette.length];
        });
        const barHoverColors = labels.map((_, i) => {
            const palette = [
                '#2563eb', '#059669', '#7c3aed', '#d97706', '#dc2626', '#0d9488', '#ea580c', '#4f46e5'
            ];
            return palette[i % palette.length];
        });

        // Dynamically size height based on number of bars (min 60px per bar)
        const barHeight = Math.max(60, labels.length * 56);
        enrollCtx.parentElement.style.height = barHeight + 'px';

        dashboardCharts.push(new Chart(enrollCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Enrolled Students',
                    data: data,
                    backgroundColor: barColors,
                    hoverBackgroundColor: barHoverColors,
                    borderRadius: 10,
                    borderSkipped: false,
                    barThickness: 30
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.9)',
                        padding: 12,
                        titleFont: { size: 12, weight: 'bold', family: "'Inter', sans-serif" },
                        bodyFont: { size: 12, family: "'Inter', sans-serif" },
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: ctx => ` ${ctx.parsed.x} Student${ctx.parsed.x !== 1 ? 's' : ''}`
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        border: { dash: [4, 4] },
                        grid: { color: '#f1f5f9' },
                        ticks: { stepSize: 1, precision: 0, font: { size: 10, family: "'Inter', sans-serif" }, color: '#94a3b8' }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { font: { size: 11, weight: 'bold', family: "'Inter', sans-serif" }, color: '#374151' }
                    }
                },
                animation: { duration: 1000, easing: 'easeOutQuart' }
            }
        }));
    }
}

async function generateDashboardInsights() {
    const btn = document.getElementById('btn-generate-insights');
    const content = document.getElementById('ai-insights-content');
    if (!btn || !content) return;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyz...';
    btn.disabled = true;
    content.innerHTML = '<div class="text-center w-full text-primary font-bold animate-pulse p-4 rounded-xl"><i class="fas fa-circle-notch fa-spin text-3xl mb-3"></i><br>Generating Intelligent Insights...</div>';

    const gradeFilter = window.globalDashGradeFilter || 'All';
    const sectionFilter = window.globalDashSectionFilter || 'All';
    let filteredStudents = getFilteredDashboardStudents();
    let summaryData = filteredStudents.map(s => ({ s: s.section, g: s.gwa, a: s.attendance })).filter(s => s.g > 0);

    let scopeText = gradeFilter;
    if (sectionFilter !== 'All') scopeText += ' - ' + sectionFilter;

    const prompt = `Act as a friendly assistant helping a teacher understand their students' grades for ${scopeText}. Write a very simple, 2-to-3 sentence summary. Use basic, everyday English. Do NOT use deep or academic words like "cohort", "pedagogical", "interventions", "anomalies", or "executive summary". Just talk normally like a friendly colleague. Point out if the class is doing well and if there are students who need more help. Do not use markdown styling. Data: ${JSON.stringify(summaryData)}`;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ message: prompt, context: "" })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || 'Failed to reach AI');
        }
        const data = await response.json();

        let chartHtml = '';
        if (summaryData.length > 0) {
            // Build GWA distribution brackets for the chart
            const dist = { '90-100': 0, '85-89': 0, '80-84': 0, '75-79': 0, 'Below 75': 0 };
            summaryData.forEach(s => {
                if (s.g >= 90) dist['90-100']++;
                else if (s.g >= 85) dist['85-89']++;
                else if (s.g >= 80) dist['80-84']++;
                else if (s.g >= 75) dist['75-79']++;
                else dist['Below 75']++;
            });

            chartHtml = `
                <div class="mt-5 pt-4 border-t border-gray-100">
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">GWA Distribution</span>
                        <span class="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">${summaryData.length} Records Analyzed</span>
                    </div>
                    <div class="h-32 w-full relative">
                        <canvas id="aiInsightChart"></canvas>
                    </div>
                </div>
            `;
        }
        content.innerHTML = `
            <div class="flex flex-col w-full">
                <span class="text-gray-700 font-medium leading-relaxed text-sm">&ldquo;${data.reply}&rdquo;</span>
                ${chartHtml}
            </div>
        `;

        // Render the chart AFTER the HTML is injected into the DOM
        if (summaryData.length > 0) {
            const aiCtx = document.getElementById('aiInsightChart');
            if (aiCtx) {
                const dist = { '90-100': 0, '85-89': 0, '80-84': 0, '75-79': 0, 'Below 75': 0 };
                summaryData.forEach(s => {
                    if (s.g >= 90) dist['90-100']++;
                    else if (s.g >= 85) dist['85-89']++;
                    else if (s.g >= 80) dist['80-84']++;
                    else if (s.g >= 75) dist['75-79']++;
                    else dist['Below 75']++;
                });

                new Chart(aiCtx, {
                    type: 'bar',
                    data: {
                        labels: Object.keys(dist),
                        datasets: [{
                            label: 'Students',
                            data: Object.values(dist),
                            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'],
                            hoverBackgroundColor: ['#059669', '#2563eb', '#d97706', '#ea580c', '#dc2626'],
                            borderRadius: 6,
                            borderSkipped: false,
                            barPercentage: 0.65
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: 'rgba(17,24,39,0.9)',
                                padding: 10,
                                titleFont: { size: 11, weight: 'bold' },
                                bodyFont: { size: 11 },
                                cornerRadius: 6,
                                callbacks: {
                                    label: ctx => ` ${ctx.parsed.y} student${ctx.parsed.y !== 1 ? 's' : ''}`
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                border: { dash: [3, 3] },
                                grid: { color: '#f1f5f9' },
                                ticks: { stepSize: 1, precision: 0, font: { size: 9, family: "'Inter', sans-serif" }, color: '#94a3b8' }
                            },
                            x: {
                                grid: { display: false },
                                ticks: { font: { size: 9, family: "'Inter', sans-serif" }, color: '#64748b' }
                            }
                        },
                        animation: { duration: 900, easing: 'easeOutQuart' }
                    }
                });
            }
        }
    } catch (e) {
        content.innerHTML = `<span class="text-red-500"><i class="fas fa-exclamation-triangle mr-2"></i>Error generating insights: ${e.message}</span>`;
    } finally {
        btn.innerHTML = '<i class="fas fa-magic"></i> Analyze';
        btn.disabled = false;
    }
}

function setFilter(type) {
    activeFilter = type;
    refreshTable();
    document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active', 'border-opacity-50'));
    document.getElementById(`card-${type}`)?.classList.add('active');
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('bg-primary', 'text-white'));
    document.getElementById(`btn-${type}`)?.classList.add('bg-primary', 'text-white');
}

function refreshTable(search = '') {
    const tbody = document.getElementById('dash-table-body');
    if (!tbody) return;

    const filteredStudents = getFilteredDashboardStudents();

    let filtered = filteredStudents.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.lrn.includes(search);
        if (!matchesSearch) return false;

        if (activeFilter === 'total') return true;
        if (activeFilter === 'attendance') return s.attendance >= 90;

        let isSH = false;
        let isJH = false;
        const gNum = getStudentGradeNumber(s);
        if (gNum) {
            if (gNum >= 11) isSH = true;
            if (gNum <= 10) isJH = true;
        }
        const hasFailing = s.subjects && s.subjects.some(sub => parseFloat(sub.g) < 75);

        if (activeFilter === 'academic_excellence') return isSH && s.gwa >= 90 && !hasFailing;
        if (activeFilter === 'risk') {
            let hasFailingSubject = false;
            if (s.subjects) {
                hasFailingSubject = s.subjects.some(sub => parseFloat(sub.g) < 75);
            }
            return (s.gwa > 0 && s.gwa < 75) || hasFailingSubject;
        }
        if (activeFilter === 'eval') return s.subjects && s.subjects.filter(sub => sub.g !== null).length >= 8;
        if (activeFilter === 'highest') return isJH && s.gwa >= 98 && !hasFailing;
        if (activeFilter === 'high') return isJH && s.gwa >= 95 && s.gwa < 98 && !hasFailing;
        if (activeFilter === 'with') return isJH && s.gwa >= 90 && s.gwa < 95 && !hasFailing;
        return true;
    });

    tbody.innerHTML = filtered.map(s => {
        let isSH = false;
        const gNum = getStudentGradeNumber(s);
        if (gNum && gNum >= 11) isSH = true;
        const hasFailing = s.subjects && s.subjects.some(sub => parseFloat(sub.g) < 75);

        let badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500">Regular</span>';
        if (s.gwa > 0) {
            if (isSH) {
                if (s.gwa >= 90 && !hasFailing) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-green-100 text-green-700 font-bold border border-green-200">Academic Excellence</span>';
                else if (s.gwa >= 75) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-green-100 text-green-600 font-bold">Regular</span>';
                else badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-600 font-bold">Failing</span>';
            } else {
                if (s.gwa >= 98 && !hasFailing) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-700 font-bold border border-yellow-200">Highest Honor</span>';
                else if (s.gwa >= 95 && !hasFailing) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 font-bold border border-purple-200">High Honor</span>';
                else if (s.gwa >= 90 && !hasFailing) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-bold border border-blue-200">With Honor</span>';
                else if (s.gwa >= 75 && s.gwa <= 79) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-orange-100 text-orange-600 font-bold">At-Risk</span>';
                else if (s.gwa >= 75) badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500 font-bold">Regular</span>';
                else badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-600 font-bold">Failing</span>';
            }
        } else {
            badge = '<span class="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-400 font-bold">No Grades</span>';
        }

        const adviseTeacher = teachers.find(t => t.is_adviser && (t.section || '').split(',').map(x => x.trim()).includes(s.section));
        const advName = adviseTeacher ? adviseTeacher.name : 'Pending Assignment';

        return `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-6 py-4 font-mono text-gray-400">${s.lrn}</td>
                <td class="px-6 py-4 font-bold text-gray-800">${s.name}</td>
                <td class="px-6 py-4 text-gray-500">${s.section}</td>
                <td class="px-6 py-4 text-gray-400 hidden xl:table-cell">${advName}</td>
                <td class="px-6 py-4 font-bold text-primary">${s.gwa > 0 ? s.gwa : '-'}</td>
                <td class="px-6 py-4">${s.attendance > 0 ? s.attendance + '%' : '-'}</td>
                <td class="px-6 py-4">${badge}</td>
                <td class="px-6 py-4">
                    <button onclick="showReportForLRN('${s.lrn}')" class="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition shadow-sm border border-blue-100 flex items-center gap-1">
                        <i class="fas fa-print"></i> Academic Report
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function searchTable(val) { refreshTable(val); }

function showReportForLRN(lrn) {
    if (typeof showReport === 'function') {
        showReport(students.find(x => x.lrn === lrn));
    }
}

function renderDrilldownTable() {
    const tbody = document.getElementById('modal-table-body');
    if (!tbody) return;

    let filtered = getFilteredDashboardStudents();

    if (modalGradeLevel !== 'All') {
        const check = modalGradeLevel.replace('Grade ', '');
        filtered = filtered.filter(s => {
            const gNum = getStudentGradeNumber(s);
            return gNum && gNum.toString() === check;
        });
    }

    if (modalSectionFilter !== 'All') {
        filtered = filtered.filter(s => s.section === modalSectionFilter);
    }

    filtered = filtered.filter(s => {
        let isSH = false;
        let isJH = false;
        const gNum = getStudentGradeNumber(s);
        if (gNum) {
            if (gNum >= 11) isSH = true;
            if (gNum <= 10) isJH = true;
        }

        if (modalActiveMetric === 'attendance') return true; // Show all students to explain the true average
        if (modalActiveMetric === 'risk') {
            let hasFailingSubject = false;
            if (s.subjects) {
                hasFailingSubject = s.subjects.some(sub => parseFloat(sub.g) < 75);
            }
            return (s.gwa > 0 && s.gwa < 75) || hasFailingSubject;
        }
        if (modalActiveMetric === 'eval') return s.subjects && s.subjects.filter(sub => sub.g !== null).length >= 8;
        if (modalActiveMetric === 'distribution' || modalActiveMetric === 'performance') return s.gwa > 0;
        return true;
    });

    const container = document.getElementById('modal-content-container');
    const table = document.getElementById('default-modal-table');
    if (!container || !table || !tbody) return;

    let existingGrid = document.getElementById('modal-grid-view');
    if (existingGrid) existingGrid.remove();

    if (modalActiveMetric === 'total') {
        table.style.display = 'none';

        let gridHtml = '<div id="modal-grid-view" class="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">';
        gridHtml += filtered.map(s => {
            return `
                <div onclick="showStudentSummaryModal('${s.lrn}')" class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col items-center cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                    <div class="absolute -right-8 -top-8 w-24 h-24 bg-primary/5 rounded-full group-hover:scale-150 transition-transform"></div>
                    <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center text-2xl font-black mb-4 shadow-sm overflow-hidden">
                        ${s.photo ? `<img src="${s.photo}" onerror="this.outerHTML='<span>${s.name.charAt(0)}</span>'" class="w-full h-full object-cover">` : `<span>${s.name.charAt(0)}</span>`}
                    </div>
                    <h4 class="font-bold text-gray-800 text-center mb-1">${s.name}</h4>
                    <p class="text-xs text-gray-400 font-mono mb-4">${s.lrn}</p>
                    <div class="w-full mt-auto flex justify-between items-center text-xs pt-4 border-t border-gray-50">
                        <span class="text-gray-500 font-bold"><i class="fas fa-users mr-1"></i> ${s.section || 'N/A'}</span>
                        <span class="bg-primary/10 text-primary font-bold px-2 py-1 rounded-lg">GWA ${s.gwa > 0 ? s.gwa : '-'}</span>
                    </div>
                </div>
            `;
        }).join('');
        gridHtml += '</div>';

        table.insertAdjacentHTML('afterend', gridHtml);
    } else {
        table.style.display = 'table';

        tbody.innerHTML = filtered.map(s => {
            let isSH = false;
            const gNum = getStudentGradeNumber(s);
            if (gNum && gNum >= 11) isSH = true;
            const hasFailing = s.subjects && s.subjects.some(sub => parseFloat(sub.g) < 75);

            let badge = '<span class="px-2 py-1 rounded-lg text-[10px] bg-gray-100 text-gray-500 font-bold">Regular</span>';
            if (s.gwa > 0) {
                if (isSH) {
                    if (s.gwa >= 90 && !hasFailing) badge = '<span class="px-2 py-1 rounded-lg text-[10px] bg-green-100 text-green-700 font-bold border border-green-200">Academic Excellence</span>';
                    else if (s.gwa >= 75) badge = '<span class="px-2 py-1 rounded-lg text-[10px] bg-green-100 text-green-600 font-bold">Regular</span>';
                    else badge = '<span class="px-2 py-1 rounded-lg text-[10px] bg-red-100 text-red-600 font-bold">Failing</span>';
                } else {
                    if (s.gwa >= 98 && !hasFailing) badge = '<span class="px-2 py-1 rounded-lg text-[10px] bg-yellow-100 text-yellow-700 font-bold border border-yellow-200">Highest Honor</span>';
                    else if (s.gwa >= 95 && !hasFailing) badge = '<span class="px-2 py-1 rounded-lg text-[10px] bg-purple-100 text-purple-700 font-bold border border-purple-200">High Honor</span>';
                    else if (s.gwa >= 90 && !hasFailing) badge = '<span class="px-2 py-1 rounded-lg text-[10px] bg-blue-100 text-blue-700 font-bold border border-blue-200">With Honor</span>';
                    else if (s.gwa >= 75 && s.gwa <= 79) badge = '<span class="px-2 py-1 rounded-lg text-[10px] bg-orange-100 text-orange-600 font-bold"><i class="fas fa-exclamation-triangle mr-1"></i>At-Risk</span>';
                    else if (s.gwa >= 75) badge = '<span class="px-2 py-1 rounded-lg text-[10px] bg-gray-100 text-gray-500 font-bold">Regular</span>';
                    else badge = '<span class="px-2 py-1 rounded-lg text-[10px] bg-red-100 text-red-600 font-bold">Failing</span>';
                }
            } else {
                badge = '<span class="px-2 py-1 rounded-lg text-[10px] bg-gray-100 text-gray-400 font-bold">No Grades</span>';
            }

            if (modalActiveMetric === 'risk') {
                badge = '<span class="px-2 py-1 rounded-lg text-[10px] bg-red-100 text-red-600 font-bold animate-pulse"><i class="fas fa-exclamation-circle mr-1"></i> Needs Attention</span>';
            }

            if (modalActiveMetric === 'eval') {
                badge = '<span class="px-2 py-1 rounded-lg text-[10px] bg-emerald-100 text-emerald-600 font-bold"><i class="fas fa-check-circle mr-1"></i> Evaluated</span>';
            }

            let attendanceDisplay = s.attendance > 0 ? s.attendance + '%' : '-';
            if (modalActiveMetric === 'attendance' && s.attendance > 0) {
                attendanceDisplay = `
                    <div class="flex items-center gap-2">
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="bg-blue-500 h-2 rounded-full" style="width: ${s.attendance}%"></div>
                        </div>
                        <span class="text-xs font-bold text-blue-600">${s.attendance}%</span>
                    </div>
                `;
            }

            let onclickAction = `showStudentSummaryModal('${s.lrn}')`;
            if (modalActiveMetric === 'risk') {
                onclickAction = `showAtRiskReason('${s.lrn}')`;
            }

            return `
                <tr onclick="${onclickAction}" class="hover:bg-gray-50 transition cursor-pointer group">
                    <td class="px-6 py-4 font-mono text-gray-400 group-hover:text-primary transition">${s.lrn}</td>
                    <td class="px-6 py-4 font-bold text-gray-800">${s.name}</td>
                    <td class="px-6 py-4 text-gray-500">${s.section}</td>
                    <td class="px-6 py-4 font-bold text-primary">${s.gwa > 0 ? s.gwa : '-'}</td>
                    <td class="px-6 py-4">${attendanceDisplay}</td>
                    <td class="px-6 py-4">${badge}</td>
                </tr>
            `;

        }).join('');
    }
}

window.showAtRiskReason = function (lrn) {
    const student = students.find(s => String(s.lrn) === String(lrn));
    if (!student) return;

    let failingSubjects = [];
    if (student.subjects) {
        student.subjects.forEach(subObj => {
            if (subObj.g !== null) {
                const grade = parseFloat(subObj.g);
                if (grade < 75) {
                    failingSubjects.push({ subject: subObj.n, grade: grade });
                }
            }
        });
    }

    let reasonHTML = '';

    if (student.gwa >= 75 && student.gwa <= 79) {
        reasonHTML += `<div class="p-3 bg-orange-50 text-orange-700 border border-orange-200 rounded-xl mb-3 text-sm">
            <strong>Low GWA:</strong> The student's overall average is <strong>${student.gwa}</strong>, which is critically close to failing.
        </div>`;
    } else if (student.gwa > 0 && student.gwa < 75) {
        reasonHTML += `<div class="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl mb-3 text-sm">
            <strong>Failing GWA:</strong> The student's overall average is <strong>${student.gwa}</strong>, which is a failing grade.
        </div>`;
    }

    if (failingSubjects.length > 0) {
        reasonHTML += `<div class="mb-3">
            <p class="text-sm font-bold text-gray-700 mb-2">Failed Subjects:</p>
            <div class="flex flex-col gap-2">
                ${failingSubjects.map(fs => `
                    <div class="flex justify-between items-center bg-red-50 px-4 py-2 rounded-lg border border-red-100 shadow-sm">
                        <span class="font-bold text-gray-700">${fs.subject}</span>
                        <span class="font-black text-red-600">${fs.grade}</span>
                    </div>
                `).join('')}
            </div>
        </div>`;
    }

    if (student.attendance > 0 && student.attendance < 80) {
        reasonHTML += `<div class="p-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl mb-3 text-sm">
            <strong>Poor Attendance:</strong> The student's attendance is <strong>${student.attendance}%</strong>, which is below the acceptable 80% threshold.
        </div>`;
    }

    if (!reasonHTML) {
        reasonHTML = '<div class="text-gray-500 text-sm text-center italic">No specific failing records found. Check manual evaluations.</div>';
    }

    let aiSuggestion = '';
    if (failingSubjects.length > 0) {
        const subjects = failingSubjects.map(f => f.subject).join(', ');
        aiSuggestion = `The student is struggling with ${subjects}. Consider assigning remedial tasks or specialized tutoring for these specific subjects. A parent-teacher consultation is highly recommended to monitor progress at home.`;
    } else if (student.gwa > 0 && student.gwa <= 79) {
        aiSuggestion = `The student's performance is borderline. Regular checking of assignments and active participation encouragement can help pull up their average.`;
    } else if (student.attendance > 0 && student.attendance < 80) {
        aiSuggestion = `Attendance is a major factor in this student's performance. Reach out to the parents to understand any underlying issues causing the absences.`;
    } else {
        aiSuggestion = `The student is currently at risk. Conduct a 1-on-1 session to understand the student's challenges.`;
    }

    reasonHTML += `<div class="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl shadow-sm relative overflow-hidden">
        <div class="absolute -right-4 -top-4 w-16 h-16 bg-blue-500/10 rounded-full blur-xl"></div>
        <div class="flex items-center gap-2 mb-2">
            <i class="fas fa-robot text-blue-600"></i>
            <span class="text-xs font-bold text-blue-800 uppercase tracking-wider">AI Suggestion</span>
        </div>
        <p class="text-sm text-blue-900 leading-relaxed">${aiSuggestion}</p>
    </div>`;

    Swal.fire({
        title: '<span class="text-gray-800 font-bold">Performance Breakdown</span>',
        html: `
            <div class="text-left mt-2">
                <div class="flex items-center gap-3 mb-5 border-b border-gray-100 pb-4">
                    <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center text-red-600 font-bold text-2xl shadow-sm overflow-hidden border border-red-100">
                        ${student.photo ? `<img src="${student.photo}" class="w-full h-full object-cover">` : student.name.charAt(0)}
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-800 text-lg">${student.name}</h4>
                        <p class="text-xs text-gray-400 font-mono tracking-widest uppercase">${student.lrn}</p>
                    </div>
                </div>
                ${reasonHTML}
            </div>
        `,
        icon: 'warning',
        confirmButtonText: 'View Report Card',
        showCancelButton: true,
        cancelButtonText: 'Close',
        confirmButtonColor: '#166534',
        cancelButtonColor: '#9CA3AF',
        customClass: {
            container: 'backdrop-blur-sm !z-[99999]',
            popup: 'rounded-3xl shadow-2xl border border-gray-100',
            confirmButton: 'rounded-xl px-5 py-2.5 font-bold shadow-sm',
            cancelButton: 'rounded-xl px-5 py-2.5 font-bold'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            closeDrilldownModal();
            showReportForLRN(lrn);
        }
    });
};

window.showStudentSummaryModal = function (lrn) {
    const student = students.find(s => String(s.lrn) === String(lrn));
    if (!student) return;

    Swal.fire({
        html: `
            <div class="text-left mt-2">
                <div class="flex items-center gap-4 mb-6 border-b border-gray-100 pb-5">
                    <div class="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-black text-3xl shadow-sm overflow-hidden border border-primary/10">
                        ${student.photo ? `<img src="${student.photo}" class="w-full h-full object-cover">` : student.name.charAt(0)}
                    </div>
                    <div>
                        <h4 class="font-black text-gray-800 text-2xl mb-1">${student.name}</h4>
                        <p class="text-sm text-gray-500 font-mono tracking-widest uppercase mb-1">${student.lrn}</p>
                        <span class="bg-gray-100 text-gray-600 font-bold px-3 py-1 rounded-lg text-xs"><i class="fas fa-users mr-1"></i>${student.section || 'Unassigned'}</span>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col items-center justify-center">
                        <span class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Overall GWA</span>
                        <span class="text-3xl font-black text-primary">${student.gwa > 0 ? student.gwa : '-'}</span>
                    </div>
                    <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col items-center justify-center">
                        <span class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Attendance</span>
                        <span class="text-3xl font-black text-blue-600">${student.attendance > 0 ? student.attendance + '%' : '-'}</span>
                    </div>
                </div>
                
                <div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <div class="flex justify-between items-center mb-3 pb-2 border-b border-gray-50">
                        <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Subject Grades</span>
                        <span class="text-[10px] px-2 py-1 bg-gray-100 rounded-lg text-gray-500 font-bold">
                            ${student.subjects ? student.subjects.filter(sub => sub.g !== null).length : 0} Subjects Recorded
                        </span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        ${student.subjects && student.subjects.filter(sub => sub.g !== null).length > 0 ? student.subjects.filter(sub => sub.g !== null).map(subObj => {
            const sub = subObj.n; const grade = subObj.g;
            const isFailing = parseFloat(grade) < 75;
            return `
                                    <div class="flex justify-between items-center px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 ${isFailing ? 'border-red-200 bg-red-50' : ''}">
                                        <span class="text-xs font-bold text-gray-600 truncate max-w-[140px]" title="${sub}">${sub}</span>
                                        <span class="text-sm font-black ${isFailing ? 'text-red-600' : 'text-gray-800'}">${grade}</span>
                                    </div>
                                `;
        }).join('')
                : '<div class="col-span-2 text-center text-xs text-gray-400 py-4 italic">No grades recorded yet.</div>'
            }
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-print mr-2"></i>Print Report',
        cancelButtonText: 'Close',
        confirmButtonColor: '#166534',
        cancelButtonColor: '#9CA3AF',
        customClass: {
            container: 'backdrop-blur-sm !z-[99999]',
            popup: 'rounded-3xl shadow-2xl border border-gray-100',
            confirmButton: 'rounded-xl px-5 py-3 font-bold shadow-sm flex items-center',
            cancelButton: 'rounded-xl px-5 py-3 font-bold'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            closeDrilldownModal();
            showReportForLRN(lrn); // This opens the report card overlay, which has the physical print logic
        }
    });
};


// --- ENROLLMENT MODAL LOGIC ---
let enrollGrade = 'All';
let enrollSection = 'All';

window.openEnrollmentModal = function () {
    enrollGrade = 'All';
    enrollSection = 'All';
    updateEnrollGradeDropdown();
    updateEnrollSectionDropdown();
    document.getElementById('dash-enrollment-modal').classList.remove('hidden');
};

function updateEnrollGradeDropdown() {
    const gradeSelect = document.getElementById('enroll-grade-select');
    if (!gradeSelect) return;
    let curr = getFilteredDashboardStudents();
    const gradesSet = new Set();
    curr.forEach(s => {
        const gNum = getStudentGradeNumber(s);
        if (gNum) gradesSet.add('Grade ' + gNum);
    });
    const grades = Array.from(gradesSet).sort((a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')));
    let html = '<option value="All">All Grades</option>';
    grades.forEach(g => { html += `<option value="${g}">${g}</option>`; });
    gradeSelect.innerHTML = html;
}

window.updateEnrollSectionDropdown = function () {
    const gradeSelect = document.getElementById('enroll-grade-select');
    enrollGrade = gradeSelect.value;
    enrollSection = 'All';
    const secSelect = document.getElementById('enroll-section-select');
    if (!secSelect) return;

    let curr = getFilteredDashboardStudents();
    if (enrollGrade !== 'All') {
        const check = parseInt(enrollGrade.replace('Grade ', ''));
        curr = curr.filter(s => getStudentGradeNumber(s) === check);
    }

    const sections = Array.from(new Set(curr.map(s => s.section))).filter(Boolean).sort();
    let html = '<option value="All">All Sections</option>';
    sections.forEach(sec => { html += `<option value="${sec}">${sec}</option>`; });
    secSelect.innerHTML = html;

    renderEnrollTable();
};

window.renderEnrollTable = function () {
    const secSelect = document.getElementById('enroll-section-select');
    if (secSelect) enrollSection = secSelect.value;

    const tbody = document.getElementById('enroll-table-body');
    if (!tbody) return;

    let filtered = getFilteredDashboardStudents();
    if (enrollGrade !== 'All') {
        const check = parseInt(enrollGrade.replace('Grade ', ''));
        filtered = filtered.filter(s => getStudentGradeNumber(s) === check);
    }
    if (enrollSection !== 'All') {
        filtered = filtered.filter(s => s.section === enrollSection);
    }

    tbody.innerHTML = filtered.map(s => {
        const adviseTeacher = typeof teachers !== 'undefined' ? teachers.find(t => t.is_adviser && (t.section || '').split(',').map(x => x.trim()).includes(s.section)) : null;
        const advName = adviseTeacher ? adviseTeacher.name : 'Pending Assignment';
        return `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-6 py-4 font-mono text-gray-400">${s.lrn}</td>
                <td class="px-6 py-4 font-bold text-gray-800">${s.name}</td>
                <td class="px-6 py-4 text-gray-500">${s.section || 'N/A'}</td>
                <td class="px-6 py-4 text-gray-400">${advName}</td>
            </tr>
        `;
    }).join('');
};


// --- DISTRIBUTION MODAL LOGIC ---
let distLevel = 'All';

window.openGradeDistributionModal = function () {
    const levelSelect = document.getElementById('dist-level-select');

    let html = '';
    // principal dashboard
    if (currentUser.role === 'principal') {
        html = `<option value="All">All Levels (JHS & SHS)</option>
                <option value="JHS">Junior High School (JHS)</option>
                <option value="SHS">Senior High School (SHS)</option>`;
        distLevel = 'All';
    } else if (currentUser.role === 'curriculum_coordinator') {
        if (currentUser.department === 'JHS') {
            // jhs curriculum coordinator
            html = `<option value="JHS">Junior High School (JHS)</option>`;
            distLevel = 'JHS';
        } else {
            // academic curriculum coordinator / techpro
            html = `<option value="SHS">Senior High School (SHS)</option>`;
            distLevel = 'SHS';
        }
    } else {
        html = `<option value="All">All Levels (JHS & SHS)</option>
                <option value="JHS">Junior High School (JHS)</option>
                <option value="SHS">Senior High School (SHS)</option>`;
        distLevel = 'All';
    }
    levelSelect.innerHTML = html;

    onDistLevelChange();
    document.getElementById('dash-distribution-modal').classList.remove('hidden');
};

window.onDistLevelChange = function () {
    const levelSelect = document.getElementById('dist-level-select');
    if (levelSelect) distLevel = levelSelect.value;

    // Update Honor Dropdown
    const honorSelect = document.getElementById('dist-honor-select');
    let honorHtml = '<option value="All">All Classifications</option>';

    if (distLevel === 'JHS') {
        honorHtml += `<option value="highest">Highest Honor</option>
                      <option value="high">High Honor</option>
                      <option value="with">With Honor</option>
                      <option value="regular">Regular</option>
                      <option value="failing">Failing</option>`;
    } else if (distLevel === 'SHS') {
        honorHtml += `<option value="academic">Academic Excellence</option>
                      <option value="regular">Regular</option>
                      <option value="failing">Failing</option>`;
    } else {
        // Mixed
        honorHtml += `<option value="highest">Highest Honor (JHS)</option>
                      <option value="high">High Honor (JHS)</option>
                      <option value="with">With Honor (JHS)</option>
                      <option value="academic">Academic Excellence (SHS)</option>
                      <option value="regular">Regular</option>
                      <option value="failing">Failing</option>`;
    }
    honorSelect.innerHTML = honorHtml;

    // Update Section Dropdown
    const secSelect = document.getElementById('dist-section-select');
    let curr = getFilteredDashboardStudents();

    if (distLevel === 'JHS') {
        curr = curr.filter(s => { const g = getStudentGradeNumber(s); return g && g <= 10; });
    } else if (distLevel === 'SHS') {
        curr = curr.filter(s => { const g = getStudentGradeNumber(s); return g && g >= 11; });
    }

    const sections = Array.from(new Set(curr.map(s => s.section))).filter(Boolean).sort();
    let secHtml = '<option value="All">All Sections</option>';
    sections.forEach(sec => { secHtml += `<option value="${sec}">${sec}</option>`; });
    secSelect.innerHTML = secHtml;

    renderDistTable();
};

window.renderDistTable = function () {
    const secSelect = document.getElementById('dist-section-select').value;
    const honorSelect = document.getElementById('dist-honor-select').value;
    const tbody = document.getElementById('dist-table-body');
    if (!tbody) return;

    let filtered = getFilteredDashboardStudents();

    // Filter Level
    if (distLevel === 'JHS') {
        filtered = filtered.filter(s => { const g = getStudentGradeNumber(s); return g && g <= 10; });
    } else if (distLevel === 'SHS') {
        filtered = filtered.filter(s => { const g = getStudentGradeNumber(s); return g && g >= 11; });
    }

    // Filter Section
    if (secSelect !== 'All') {
        filtered = filtered.filter(s => s.section === secSelect);
    }

    // Filter Honor
    if (honorSelect !== 'All') {
        filtered = filtered.filter(s => {
            if (!s.gwa || s.gwa === 0) return false;
            const gNum = getStudentGradeNumber(s);
            const isSH = gNum >= 11;
            const hasFailing = s.subjects && s.subjects.some(sub => parseFloat(sub.g) < 75);

            if (honorSelect === 'highest') return !isSH && s.gwa >= 98 && !hasFailing;
            if (honorSelect === 'high') return !isSH && s.gwa >= 95 && s.gwa < 98 && !hasFailing;
            if (honorSelect === 'with') return !isSH && s.gwa >= 90 && s.gwa < 95 && !hasFailing;
            if (honorSelect === 'academic') return isSH && s.gwa >= 90 && !hasFailing;
            if (honorSelect === 'regular') {
                if (isSH) return s.gwa >= 75 && !(s.gwa >= 90 && !hasFailing) && !hasFailing;
                return s.gwa >= 75 && !(s.gwa >= 90 && !hasFailing) && !hasFailing;
            }
            if (honorSelect === 'failing') return hasFailing || s.gwa < 75;
            return true;
        });
    }

    // Exclude zero gwa from distribution table
    filtered = filtered.filter(s => s.gwa > 0);

    tbody.innerHTML = filtered.map(s => {
        const gNum = getStudentGradeNumber(s);
        const isSH = gNum >= 11;
        const hasFailing = s.subjects && s.subjects.some(sub => parseFloat(sub.g) < 75);

        let badge = '<span class="px-2 py-1 rounded-lg text-[10px] bg-gray-100 text-gray-500 font-bold">Regular</span>';
        if (isSH) {
            if (s.gwa >= 90 && !hasFailing) badge = '<span class="px-2 py-1 rounded-lg text-[10px] bg-green-100 text-green-700 font-bold border border-green-200">Academic Excellence</span>';
            else if (s.gwa >= 75 && !hasFailing) badge = '<span class="px-2 py-1 rounded-lg text-[10px] bg-gray-100 text-gray-600 font-bold">Regular</span>';
            else badge = '<span class="px-2 py-1 rounded-lg text-[10px] bg-red-100 text-red-600 font-bold">Failing</span>';
        } else {
            if (s.gwa >= 98 && !hasFailing) badge = '<span class="px-2 py-1 rounded-lg text-[10px] bg-yellow-100 text-yellow-700 font-bold border border-yellow-200">Highest Honor</span>';
            else if (s.gwa >= 95 && !hasFailing) badge = '<span class="px-2 py-1 rounded-lg text-[10px] bg-purple-100 text-purple-700 font-bold border border-purple-200">High Honor</span>';
            else if (s.gwa >= 90 && !hasFailing) badge = '<span class="px-2 py-1 rounded-lg text-[10px] bg-blue-100 text-blue-700 font-bold border border-blue-200">With Honor</span>';
            else if (s.gwa >= 75 && !hasFailing) badge = '<span class="px-2 py-1 rounded-lg text-[10px] bg-gray-100 text-gray-500 font-bold">Regular</span>';
            else badge = '<span class="px-2 py-1 rounded-lg text-[10px] bg-red-100 text-red-600 font-bold">Failing</span>';
        }

        return `
            <tr onclick="showStudentSummaryModal('${s.lrn}')" class="hover:bg-gray-50 transition cursor-pointer group">
                <td class="px-6 py-4 font-mono text-gray-400 group-hover:text-primary transition">${s.lrn}</td>
                <td class="px-6 py-4 font-bold text-gray-800">${s.name}</td>
                <td class="px-6 py-4 text-gray-500">${s.section || 'N/A'}</td>
                <td class="px-6 py-4 font-bold text-primary">${s.gwa > 0 ? s.gwa : '-'}</td>
                <td class="px-6 py-4">${badge}</td>
            </tr>
        `;
    }).join('');
};



let secAvgGradeLevel = 'All';
let secAvgSectionLevel = 'All';

window.openSectionAverageModal = function () {
    secAvgGradeLevel = 'All';
    secAvgSectionLevel = 'All';
    updateSecAvgGradeDropdown();
    updateSecAvgSectionDropdown();
    renderSectionAverageModal();
    document.getElementById('dash-section-avg-modal').classList.remove('hidden');
};

function updateSecAvgGradeDropdown() {
    const select = document.getElementById('section-avg-grade-select');
    if (!select) return;
    let curr = getFilteredDashboardStudents();
    const gradesSet = new Set();
    curr.forEach(s => {
        const gNum = getStudentGradeNumber(s);
        if (gNum) gradesSet.add('Grade ' + gNum);
    });
    const grades = Array.from(gradesSet).sort((a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')));
    let html = '<option value="All">All Grades</option>';
    grades.forEach(g => { html += `<option value="${g}">${g}</option>`; });
    select.innerHTML = html;
    if (select.value !== secAvgGradeLevel) {
        select.value = secAvgGradeLevel;
    }
}

window.updateSecAvgSectionDropdown = function () {
    const secSelect = document.getElementById('section-avg-section-select');
    if (!secSelect) return;

    let curr = getFilteredDashboardStudents();
    if (secAvgGradeLevel !== 'All') {
        const check = parseInt(secAvgGradeLevel.replace('Grade ', ''));
        curr = curr.filter(s => getStudentGradeNumber(s) === check);
    }

    const sections = Array.from(new Set(curr.map(s => s.section))).filter(Boolean).sort();
    let html = '<option value="All">All Sections</option>';
    sections.forEach(sec => { html += `<option value="${sec}">${sec}</option>`; });
    secSelect.innerHTML = html;
    secSelect.value = 'All';
    secAvgSectionLevel = 'All';
};

window.onSecAvgGradeChange = function () {
    const select = document.getElementById('section-avg-grade-select');
    if (select) secAvgGradeLevel = select.value;
    updateSecAvgSectionDropdown();
    renderSectionAverageModal();
};

window.renderSectionAverageModal = function () {
    const gradeSelect = document.getElementById('section-avg-grade-select');
    if (gradeSelect) secAvgGradeLevel = gradeSelect.value;
    const secSelect = document.getElementById('section-avg-section-select');
    if (secSelect) secAvgSectionLevel = secSelect.value;

    let filtered = getFilteredDashboardStudents();
    if (secAvgGradeLevel !== 'All') {
        const check = parseInt(secAvgGradeLevel.replace('Grade ', ''));
        filtered = filtered.filter(s => getStudentGradeNumber(s) === check);
    }
    if (secAvgSectionLevel !== 'All') {
        filtered = filtered.filter(s => s.section === secAvgSectionLevel);
    }

    // Group by section
    const sections = {};
    filtered.forEach(s => {
        if (!s.section) return;
        if (!sections[s.section]) sections[s.section] = { name: s.section, students: [], sum: 0, count: 0 };
        if (s.gwa > 0) {
            sections[s.section].students.push(s);
            sections[s.section].sum += parseFloat(s.gwa);
            sections[s.section].count++;
        }
    });

    const secArr = Object.values(sections).filter(s => s.count > 0).map(s => {
        s.avg = (s.sum / s.count).toFixed(2);
        // sort students in section by GWA highest to lowest
        s.students.sort((a, b) => b.gwa - a.gwa);
        return s;
    });

    // Sort sections by average GWA highest to lowest
    secArr.sort((a, b) => b.avg - a.avg);

    const grid = document.getElementById('section-avg-grid');
    if (!grid) return;

    let html = '';
    secArr.forEach((sec, idx) => {
        const topStudent = sec.students[0];
        const isTop = idx === 0 && secAvgSectionLevel === 'All';
        const medal = isTop ? '<i class="fas fa-medal text-yellow-500 text-xl ml-2 drop-shadow-sm"></i>' : '';
        const bgClass = isTop ? 'bg-gradient-to-br from-yellow-50 to-white border-yellow-200' : 'bg-white border-gray-100';

        let topStudentHtml = '';
        if (topStudent) {
            topStudentHtml = `
                <div class="mt-4 pt-4 border-t border-gray-100">
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2"><i class="fas fa-star text-yellow-400 mr-1"></i>Top Performing Student</p>
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 font-bold border border-green-100 overflow-hidden shadow-inner">
                            ${topStudent.photo ? `<img src="${topStudent.photo}" class="w-full h-full object-cover rounded-xl">` : topStudent.name.charAt(0)}
                        </div>
                        <div>
                            <p class="text-sm font-bold text-gray-800 truncate max-w-[200px]">${topStudent.name}</p>
                            <p class="text-xs font-mono text-gray-500">GWA: <span class="font-bold text-green-600">${topStudent.gwa}</span></p>
                        </div>
                    </div>
                </div>
            `;
        }

        html += `
            <div class="rounded-2xl border ${bgClass} shadow-sm p-5 hover:shadow-md transition-shadow relative overflow-hidden group">
                ${isTop ? '<div class="absolute -right-10 -top-10 w-24 h-24 bg-yellow-100 rounded-full blur-2xl opacity-50"></div>' : ''}
                <div class="flex justify-between items-start relative z-10">
                    <div>
                        <h4 class="text-lg font-black text-gray-800 flex items-center">${sec.name} ${medal}</h4>
                        <p class="text-xs text-gray-500 font-bold mt-1"><i class="fas fa-users mr-1"></i>${sec.count} Graded Students</p>
                    </div>
                    <div class="bg-green-100 text-green-700 font-black text-xl px-3 py-2 rounded-xl border border-green-200 shadow-inner">
                        ${sec.avg}
                    </div>
                </div>
                ${topStudentHtml}
            </div>
        `;
    });

    if (secArr.length === 0) {
        html = '<div class="col-span-1 md:col-span-2 text-center py-10 text-gray-400 italic font-bold">No sections with graded students available yet.</div>';
    }

    grid.innerHTML = html;

    // AI Insight logic
    const insightText = document.getElementById('section-avg-insight-text');
    if (insightText) {
        if (secAvgSectionLevel !== 'All' && secArr.length === 1) {
            insightText.innerHTML = `Showing performance overview for section <strong>${secArr[0].name}</strong>. The section average is <strong>${secArr[0].avg}</strong>.`;
        }
        else if (secArr.length > 1) {
            const highest = secArr[0];
            const lowest = secArr[secArr.length - 1];
            let msg = `<strong>${highest.name}</strong> is currently leading `;
            if (secAvgGradeLevel !== 'All') msg += `for <strong>${secAvgGradeLevel}</strong> `;
            msg += `with a high average GWA of <strong>${highest.avg}</strong>. Meanwhile, <strong>${lowest.name}</strong> has a lower average of <strong>${lowest.avg}</strong> and might need some extra help.`;
            insightText.innerHTML = msg;
        } else if (secArr.length === 1) {
            insightText.innerHTML = `<strong>${secArr[0].name}</strong> is performing well with an average GWA of <strong>${secArr[0].avg}</strong>. Keep up the good work!`;
        } else {
            insightText.innerHTML = `Not enough graded data to generate section insights yet. Ensure students have grades encoded.`;
        }
    }
};
