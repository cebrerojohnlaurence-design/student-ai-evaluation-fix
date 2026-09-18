/**
 * admin/dashboard.js — Dashboard page render functions
 */

let dashboardCharts = [];
let dashGradeLevel = 'All';
let dashSectionFilter = 'All';
let dashHasJHS = true;
let dashHasSHS = true;

function getFilteredDashboardStudents() {
    let curr = students;
    
    if (currentUser.role === 'teacher') {
        const handled = currentUser.handledSections || [];
        curr = curr.filter(s => handled.includes(s.section));
    } else if (currentUser.role === 'curriculum_coordinator') {
        if (currentUser.department === 'JHS') {
            curr = curr.filter(s => {
                if (!s.section) return false;
                const match = s.section.match(/\b([7-9]|1[0-2])\b/);
                if (match && parseInt(match[1]) <= 10) return true;
                if (typeof teachers !== 'undefined') {
                    const adv = teachers.find(t => t.is_adviser && (t.section || '').split(',').map(x => x.trim().toLowerCase()).includes(s.section.toLowerCase()));
                    if (adv && adv.level === 'JH') return true;
                }
                return false;
            });
        } else if (currentUser.department === 'SHS') {
            curr = curr.filter(s => {
                if (!s.section) return false;
                const match = s.section.match(/\b([7-9]|1[0-2])\b/);
                if (match && parseInt(match[1]) >= 11) return true;
                if (typeof teachers !== 'undefined') {
                    const adv = teachers.find(t => t.is_adviser && (t.section || '').split(',').map(x => x.trim().toLowerCase()).includes(s.section.toLowerCase()));
                    if (adv && adv.level === 'SH') return true;
                }
                return false;
            });
        }
    }
    return curr;
}

let modalGradeLevel = 'All';
let modalSectionFilter = 'All';
let modalActiveMetric = 'total';

function updateDashGradeDropdown(selectId) {
    const gradeSelect = document.getElementById(selectId);
    if (!gradeSelect) return;
    
    let curr = getFilteredDashboardStudents();
    
    const gradesSet = new Set();
    curr.forEach(s => {
        if (s.section) {
            const match = s.section.match(/\b([7-9]|1[0-2])\b/);
            if (match) gradesSet.add('Grade ' + match[1]);
        }
    });
    
    const grades = Array.from(gradesSet).sort((a,b) => {
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
    const gradeSelect = document.getElementById('ai-grade-level');
    if (!secSelect || !gradeSelect) return;
    
    let curr = getFilteredDashboardStudents();
    const gVal = gradeSelect.value;
    
    if (gVal !== 'All') {
        const check = gVal.replace('Grade ', '');
        curr = curr.filter(s => {
            const m = (s.section || '').match(/\b([7-9]|1[0-2])\b/);
            return m && m[1] === check;
        });
    }
    
    const sections = Array.from(new Set(curr.map(s => s.section))).filter(Boolean).sort();
    let html = '<option value="All">All Sections</option>';
    sections.forEach(sec => {
        html += `<option value="${sec}">${sec}</option>`;
    });
    secSelect.innerHTML = html;
}

function updateModalGradeDropdown() {
    const gradeSelect = document.getElementById('modal-grade-select');
    if (!gradeSelect) return;
    
    let curr = getFilteredDashboardStudents();
    
    const gradesSet = new Set();
    curr.forEach(s => {
        if (s.section) {
            const match = s.section.match(/\b([7-9]|1[0-2])\b/);
            if (match) gradesSet.add('Grade ' + match[1]);
        }
    });
    
    const grades = Array.from(gradesSet).sort((a,b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numA - numB;
    });

    let html = `<option value="All">All Grades</option>`;
    grades.forEach(g => {
        const isSelected = (modalGradeLevel === g) ? 'selected' : '';
        html += `<option value="${g}" ${isSelected}>${g}</option>`;
    });
    gradeSelect.innerHTML = html;
}

function updateModalSectionDropdown() {
    const secSelect = document.getElementById('modal-section-select');
    if (!secSelect) return;
    
    let curr = getFilteredDashboardStudents();

    if (modalGradeLevel !== 'All') {
        const check = modalGradeLevel.replace('Grade ', '');
        curr = curr.filter(s => {
            const m = (s.section || '').match(/\b([7-9]|1[0-2])\b/);
            return m && m[1] === check;
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
        'attendance': 'Average Attendance (>=90%)',
        'risk': 'At-Risk Students',
        'eval': 'Evaluation Done',
        'enrollment': 'Enrollment by Grade',
        'distribution': 'Grade Distribution',
        'performance': 'Section Performance'
    };
    const titleEl = document.getElementById('drilldown-modal-title');
    if(titleEl) titleEl.innerText = titles[metric] || 'Students';
    
    updateModalGradeDropdown();
    updateModalSectionDropdown();
    renderDrilldownTable();
    
    const modal = document.getElementById('dash-drilldown-modal');
    if(modal) modal.classList.remove('hidden');
}

function closeDrilldownModal() {
    const modal = document.getElementById('dash-drilldown-modal');
    if(modal) modal.classList.add('hidden');
}

function renderDashboard(area) {
    dashHasJHS = false;
    dashHasSHS = false;
    let curr = students;
    
    if (currentUser.role === 'teacher') {
        const handled = currentUser.handledSections || [];
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
        if (!dashHasJHS && !dashHasSHS) {
            // fallback if teacher has no sections
            dashHasJHS = true;
        }
    } else if (currentUser.role === 'curriculum_coordinator') {
        if (currentUser.department === 'JHS') {
            dashHasJHS = true;
            dashHasSHS = false;
        } else if (currentUser.department === 'SHS') {
            dashHasJHS = false;
            dashHasSHS = true;
        }
    } else {
        dashHasJHS = true;
        dashHasSHS = true;
    }

    const filteredStudents = getFilteredDashboardStudents();
    
    const evaluated = filteredStudents.filter(s => s.gwa > 0).length;
    // At-Risk: Not completely failed, but near failing (75-79) or low attendance (<80%)
    const atRisk = filteredStudents.filter(s => (s.gwa >= 75 && s.gwa <= 79) || (s.attendance > 0 && s.attendance < 80)).length;
    const avgAttendance = filteredStudents.length > 0 ? Math.round(filteredStudents.reduce((a, b) => a + b.attendance, 0) / filteredStudents.length) : 0;

    area.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 animate-fade-in">
            <h2 class="text-2xl font-bold text-gray-800 tracking-tight">Overview</h2>
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
            <div onclick="openDrilldownModal('enrollment')" class="bg-gradient-to-br from-white to-blue-50 p-6 rounded-3xl shadow-sm border border-blue-100 flex flex-col cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                <div class="absolute -right-8 -top-8 w-36 h-36 bg-blue-200 rounded-full blur-3xl opacity-30"></div>
                <h3 class="text-xs font-bold text-blue-800 mb-4 uppercase tracking-widest relative z-10"><i class="fas fa-users text-blue-500 mr-2"></i>Enrollment by Section</h3>
                <div class="flex-1 relative z-10" style="min-height: 180px;">
                    <canvas id="enrollmentChart"></canvas>
                </div>
            </div>

            <!-- Chart 2: Section Average GWA (center) -->
            <div onclick="openDrilldownModal('performance')" class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative">
                <h3 class="text-xs font-bold text-gray-800 mb-4 uppercase tracking-widest"><i class="fas fa-chart-bar text-green-500 mr-2"></i>Section Average (GWA)</h3>
                <div class="flex-1 relative min-h-[180px]">
                    <canvas id="sectionPerformanceChart"></canvas>
                </div>
            </div>

            <!-- Chart 3: Grade Distribution (right) -->
            <div onclick="openDrilldownModal('distribution')" class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative">
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
                    <select id="ai-grade-level" onchange="updateDashSectionDropdown('ai-section-filter')" class="text-[10px] bg-white border border-gray-200 outline-none px-2 py-1 rounded">
                        <!-- Populated dynamically -->
                    </select>
                    <select id="ai-section-filter" class="text-[10px] bg-white border border-gray-200 outline-none px-2 py-1 rounded">
                        <option value="All">All Sections</option>
                    </select>
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

    updateDashGradeDropdown('ai-grade-level');
    updateDashSectionDropdown('ai-section-filter');
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
        const hasFailing = s.grades && Object.values(s.grades).some(g => parseFloat(g) < 75);

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
            if (highest > 0)   { chartLabels.push('Highest Honor'); chartData.push(highest);   chartBg.push('#fef08a'); chartBorder.push('#eab308'); }
            if (high > 0)      { chartLabels.push('High Honor');    chartData.push(high);       chartBg.push('#e9d5ff'); chartBorder.push('#a855f7'); }
            if (withHonor > 0) { chartLabels.push('With Honor');    chartData.push(withHonor);  chartBg.push('#bfdbfe'); chartBorder.push('#3b82f6'); }
        }

        // SHS honors — only for SHS coordinator or admin
        if (dashHasSHS) {
            if (academicExcellence > 0) { chartLabels.push('Academic Excellence'); chartData.push(academicExcellence); chartBg.push('#a7f3d0'); chartBorder.push('#10b981'); }
        }

        // Common categories — always show if > 0
        if (regular > 0)  { chartLabels.push('Regular');   chartData.push(regular);  chartBg.push('#f3f4f6'); chartBorder.push('#9ca3af'); }
        if (failing > 0)  { chartLabels.push('Failing');   chartData.push(failing);  chartBg.push('#fecaca'); chartBorder.push('#ef4444'); }
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
            if (!s.section) return;

            // Try to extract grade number directly from section name first
            const match = s.section.match(/\b([7-9]|1[0-2])\b/);
            if (match) {
                const g = 'Grade ' + match[1];
                gradesCount[g] = (gradesCount[g] || 0) + 1;
                return;
            }

            // Fallback: look up the adviser teacher to determine JH (7-10) or SH (11-12)
            if (typeof teachers !== 'undefined') {
                const adv = teachers.find(t =>
                    t.is_adviser &&
                    (t.section || '').split(',').map(x => x.trim().toLowerCase()).includes(s.section.toLowerCase())
                );
                if (adv) {
                    // JH advisers → label as their actual grade if known, else group as "JHS"
                    if (adv.level === 'JH') {
                        const g = 'JHS (' + s.section + ')';
                        gradesCount[g] = (gradesCount[g] || 0) + 1;
                    } else if (adv.level === 'SH') {
                        const g = 'SHS (' + s.section + ')';
                        gradesCount[g] = (gradesCount[g] || 0) + 1;
                    } else {
                        gradesCount[s.section] = (gradesCount[s.section] || 0) + 1;
                    }
                    return;
                }
            }

            // Last resort: just use the section name itself
            gradesCount[s.section] = (gradesCount[s.section] || 0) + 1;
        });
        
        let labels = Object.keys(gradesCount).sort((a,b) => {
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

    const gradeFilter = document.getElementById('ai-grade-level') ? document.getElementById('ai-grade-level').value : 'All';
    const sectionFilter = document.getElementById('ai-section-filter') ? document.getElementById('ai-section-filter').value : 'All';
    let summaryData = students.map(s => ({ s: s.section, g: s.gwa, a: s.attendance })).filter(s => s.g > 0);
    
    if (gradeFilter !== 'All') {
        const check = gradeFilter.replace('Grade ', '');
        summaryData = summaryData.filter(s => {
            const m = (s.s || '').match(/\b([7-9]|1[0-2])\b/);
            return m && m[1] === check;
        });
    }
    if (sectionFilter !== 'All') {
        summaryData = summaryData.filter(s => s.s === sectionFilter);
    }
    
    let scopeText = gradeFilter;
    if (sectionFilter !== 'All') scopeText += ' - ' + sectionFilter;

    const prompt = `Act as an expert Academic Data Analyst for the 'AI-Driven Student Evaluation System'. Analyze this student cohort data (for ${scopeText}) and provide a concise, 2-to-3 sentence executive summary. Highlight any notable anomalies, strong performing sections, or areas needing pedagogical attention. Keep it highly professional. Do not use markdown styling. Data: ${JSON.stringify(summaryData)}`;

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
        if (s.section) {
            const match = s.section.match(/\b([7-9]|1[0-2])\b/);
            if (match) {
                const val = parseInt(match[1]);
                if (val >= 11) isSH = true;
                if (val <= 10) isJH = true;
            }
        }
        const hasFailing = s.grades && Object.values(s.grades).some(g => parseFloat(g) < 75);

        if (activeFilter === 'academic_excellence') return isSH && s.gwa >= 90 && !hasFailing;
        if (activeFilter === 'risk') return (s.gwa >= 75 && s.gwa <= 79) || (s.attendance > 0 && s.attendance < 80);
        if (activeFilter === 'eval') return s.gwa > 0;
        if (activeFilter === 'highest') return isJH && s.gwa >= 98 && !hasFailing;
        if (activeFilter === 'high') return isJH && s.gwa >= 95 && s.gwa < 98 && !hasFailing;
        if (activeFilter === 'with') return isJH && s.gwa >= 90 && s.gwa < 95 && !hasFailing;
        return true;
    });

    tbody.innerHTML = filtered.map(s => {
        let isSH = false;
        if (s.section) {
            const match = s.section.match(/\b([7-9]|1[0-2])\b/);
            if (match && parseInt(match[1]) >= 11) isSH = true;
        }
        const hasFailing = s.grades && Object.values(s.grades).some(g => parseFloat(g) < 75);

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
            const m = (s.section || '').match(/\b([7-9]|1[0-2])\b/);
            return m && m[1] === check;
        });
    }

    if (modalSectionFilter !== 'All') {
        filtered = filtered.filter(s => s.section === modalSectionFilter);
    }

    filtered = filtered.filter(s => {
        let isSH = false;
        let isJH = false;
        if (s.section) {
            const match = s.section.match(/\b([7-9]|1[0-2])\b/);
            if (match) {
                const val = parseInt(match[1]);
                if (val >= 11) isSH = true;
                if (val <= 10) isJH = true;
            }
        }

        if (modalActiveMetric === 'attendance') return s.attendance >= 90;
        if (modalActiveMetric === 'risk') return (s.gwa >= 75 && s.gwa <= 79) || (s.attendance > 0 && s.attendance < 80);
        if (modalActiveMetric === 'eval') return s.gwa > 0;
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
                <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col items-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                    <div class="absolute -right-8 -top-8 w-24 h-24 bg-primary/5 rounded-full group-hover:scale-150 transition-transform"></div>
                    <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center text-2xl font-black mb-4 shadow-sm">
                        ${s.name.charAt(0)}
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
            if (s.section) {
                const match = s.section.match(/\b([7-9]|1[0-2])\b/);
                if (match && parseInt(match[1]) >= 11) isSH = true;
            }
            const hasFailing = s.grades && Object.values(s.grades).some(g => parseFloat(g) < 75);

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

            return `
                <tr class="hover:bg-blue-50/30 transition-colors group">
                    <td class="px-6 py-4 font-mono text-gray-400 text-xs">${s.lrn}</td>
                    <td class="px-6 py-4 font-bold text-gray-800">${s.name}</td>
                    <td class="px-6 py-4 text-gray-500 font-medium">${s.section}</td>
                    <td class="px-6 py-4 font-black text-primary">${s.gwa > 0 ? s.gwa : '-'}</td>
                    <td class="px-6 py-4 w-48">${attendanceDisplay}</td>
                    <td class="px-6 py-4">${badge}</td>
                </tr>
            `;
        }).join('');
    }
}
