const fs = require('fs');
const file = 'd:/practice/practice/ai-driven/public/js/admin/dashboard.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove click from Section Average
content = content.replace(
    /onclick="openDrilldownModal\('performance'\)" class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col cursor-pointer/g,
    'class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col"'
);

// 2. Change click on Enrollment and Grade Distribution
content = content.replace(
    /onclick="openDrilldownModal\('enrollment'\)"/g,
    'onclick="openEnrollmentModal()"'
);
content = content.replace(
    /onclick="openDrilldownModal\('distribution'\)"/g,
    'onclick="openGradeDistributionModal()"'
);

// 3. Inject new modals into HTML
const newModals = `
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
`;

if (!content.includes('dash-enrollment-modal')) {
    content = content.replace('<!-- Drilldown Modal -->', newModals + '\n        <!-- Drilldown Modal -->');
}

// 4. Inject JS logic for new modals
const logicJS = `
// --- ENROLLMENT MODAL LOGIC ---
let enrollGrade = 'All';
let enrollSection = 'All';

window.openEnrollmentModal = function() {
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
    const grades = Array.from(gradesSet).sort((a,b) => parseInt(a.replace(/\\D/g, '')) - parseInt(b.replace(/\\D/g, '')));
    let html = '<option value="All">All Grades</option>';
    grades.forEach(g => { html += \`<option value="\${g}">\${g}</option>\`; });
    gradeSelect.innerHTML = html;
}

window.updateEnrollSectionDropdown = function() {
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
    sections.forEach(sec => { html += \`<option value="\${sec}">\${sec}</option>\`; });
    secSelect.innerHTML = html;
    
    renderEnrollTable();
};

window.renderEnrollTable = function() {
    const secSelect = document.getElementById('enroll-section-select');
    if(secSelect) enrollSection = secSelect.value;
    
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
        return \`
            <tr class="hover:bg-gray-50 transition">
                <td class="px-6 py-4 font-mono text-gray-400">\${s.lrn}</td>
                <td class="px-6 py-4 font-bold text-gray-800">\${s.name}</td>
                <td class="px-6 py-4 text-gray-500">\${s.section || 'N/A'}</td>
                <td class="px-6 py-4 text-gray-400">\${advName}</td>
            </tr>
        \`;
    }).join('');
};


// --- DISTRIBUTION MODAL LOGIC ---
let distLevel = 'All';

window.openGradeDistributionModal = function() {
    const levelSelect = document.getElementById('dist-level-select');
    
    let html = '';
    if (currentUser.role === 'principal') {
        html = \`<option value="All">All Levels (JHS & SHS)</option>
                <option value="JHS">Junior High School (JHS)</option>
                <option value="SHS">Senior High School (SHS)</option>\`;
        distLevel = 'All';
    } else if (currentUser.role === 'curriculum_coordinator') {
        if (currentUser.department === 'JHS') {
            html = \`<option value="JHS">Junior High School (JHS)</option>\`;
            distLevel = 'JHS';
        } else {
            html = \`<option value="SHS">Senior High School (SHS)</option>\`;
            distLevel = 'SHS';
        }
    } else {
        html = \`<option value="All">All Levels (JHS & SHS)</option>
                <option value="JHS">Junior High School (JHS)</option>
                <option value="SHS">Senior High School (SHS)</option>\`;
        distLevel = 'All';
    }
    levelSelect.innerHTML = html;
    
    onDistLevelChange();
    document.getElementById('dash-distribution-modal').classList.remove('hidden');
};

window.onDistLevelChange = function() {
    const levelSelect = document.getElementById('dist-level-select');
    if(levelSelect) distLevel = levelSelect.value;
    
    // Update Honor Dropdown
    const honorSelect = document.getElementById('dist-honor-select');
    let honorHtml = '<option value="All">All Classifications</option>';
    
    if (distLevel === 'JHS') {
        honorHtml += \`<option value="highest">Highest Honor</option>
                      <option value="high">High Honor</option>
                      <option value="with">With Honor</option>
                      <option value="regular">Regular</option>
                      <option value="failing">Failing</option>\`;
    } else if (distLevel === 'SHS') {
        honorHtml += \`<option value="academic">Academic Excellence</option>
                      <option value="regular">Regular</option>
                      <option value="failing">Failing</option>\`;
    } else {
        // Mixed
        honorHtml += \`<option value="highest">Highest Honor (JHS)</option>
                      <option value="high">High Honor (JHS)</option>
                      <option value="with">With Honor (JHS)</option>
                      <option value="academic">Academic Excellence (SHS)</option>
                      <option value="regular">Regular</option>
                      <option value="failing">Failing</option>\`;
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
    sections.forEach(sec => { secHtml += \`<option value="\${sec}">\${sec}</option>\`; });
    secSelect.innerHTML = secHtml;
    
    renderDistTable();
};

window.renderDistTable = function() {
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
        
        return \`
            <tr onclick="showStudentSummaryModal('\${s.lrn}')" class="hover:bg-gray-50 transition cursor-pointer group">
                <td class="px-6 py-4 font-mono text-gray-400 group-hover:text-primary transition">\${s.lrn}</td>
                <td class="px-6 py-4 font-bold text-gray-800">\${s.name}</td>
                <td class="px-6 py-4 text-gray-500">\${s.section || 'N/A'}</td>
                <td class="px-6 py-4 font-bold text-primary">\${s.gwa > 0 ? s.gwa : '-'}</td>
                <td class="px-6 py-4">\${badge}</td>
            </tr>
        \`;
    }).join('');
};
`;

if (!content.includes('window.openEnrollmentModal')) {
    content += '\n' + logicJS;
}

fs.writeFileSync(file, content);
console.log('Modals injected');
