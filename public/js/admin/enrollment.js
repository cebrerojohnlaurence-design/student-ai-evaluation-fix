// public/js/admin/enrollment.js

let enrollmentSearchTerm = '';
let enrollmentSelectedStudent = null;
let enrollmentSelectedTrack = 'Academic - STEM';
let enrollmentSelectedGrade = '11';
let enrollmentSelectedTerm = '1';

const SHS_CURRICULUM_TEMPLATES = {
    'Academic - STEM': {
        '11': {
            '1': ['Oral Communication in Context', 'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino', 'General Mathematics', 'Earth Science', 'Pre-Calculus', 'Personal Development', 'Physical Education and Health 1'],
            '2': ['Reading and Writing Skills', 'Pagbasa at Pagsusuri ng Iba’t Ibang Teksto', 'Statistics and Probability', 'Disaster Readiness and Risk Reduction', 'Basic Calculus', 'Physical Education and Health 2'],
            '3': ['21st Century Literature', 'Contemporary Philippine Arts', 'General Physics 1', 'General Biology 1', 'Physical Education and Health 3'] // If Trimester
        },
        '12': {
            '1': ['21st Century Literature from the Philippines and the World', 'Contemporary Philippine Arts from the Regions', 'Media and Information Literacy', 'General Physics 1', 'General Biology 1', 'Physical Education and Health 3'],
            '2': ['Understanding Culture, Society and Politics', 'Introduction to the Philosophy of the Human Person', 'Physical Science', 'General Physics 2', 'General Biology 2', 'General Chemistry 1', 'Physical Education and Health 4']
        }
    },
    'Academic - ABM': {
        '11': {
            '1': ['Oral Communication in Context', 'Komunikasyon at Pananaliksik', 'General Mathematics', 'Earth and Life Science', 'Business Math', 'Organization and Management', 'Physical Education and Health 1'],
            '2': ['Reading and Writing Skills', 'Pagbasa at Pagsusuri', 'Statistics and Probability', 'Physical Science', 'Fundamentals of Accountancy, Business and Management 1', 'Principles of Marketing', 'Physical Education and Health 2']
        },
        '12': {
            '1': ['21st Century Literature', 'Contemporary Philippine Arts', 'Media and Information Literacy', 'Fundamentals of Accountancy, Business and Management 2', 'Business Finance', 'Physical Education and Health 3'],
            '2': ['Understanding Culture', 'Philosophy of the Human Person', 'Applied Economics', 'Business Enterprise Simulation', 'Physical Education and Health 4']
        }
    },
    'Academic - HUMSS': {
        '11': {
            '1': ['Oral Communication in Context', 'Komunikasyon at Pananaliksik', 'General Mathematics', 'Earth and Life Science', 'Philippine Politics and Governance', 'Introduction to World Religions', 'Physical Education and Health 1'],
            '2': ['Reading and Writing Skills', 'Pagbasa at Pagsusuri', 'Statistics and Probability', 'Physical Science', 'Disciplines and Ideas in the Social Sciences', 'Creative Writing', 'Physical Education and Health 2']
        },
        '12': {
            '1': ['21st Century Literature', 'Contemporary Philippine Arts', 'Media and Information Literacy', 'Creative Nonfiction', 'Trends, Networks, and Critical Thinking', 'Physical Education and Health 3'],
            '2': ['Understanding Culture', 'Philosophy of the Human Person', 'Disciplines and Ideas in the Applied Social Sciences', 'Community Engagement, Solidarity, and Citizenship', 'Physical Education and Health 4']
        }
    },
    'TechPro - ICT': {
        '11': {
            '1': ['Oral Communication in Context', 'Komunikasyon at Pananaliksik', 'General Mathematics', 'Earth and Life Science', 'Computer Systems Servicing NC II (Part 1)', 'Empowerment Technologies', 'Physical Education and Health 1'],
            '2': ['Reading and Writing Skills', 'Pagbasa at Pagsusuri', 'Statistics and Probability', 'Physical Science', 'Computer Systems Servicing NC II (Part 2)', 'Research in Daily Life 1', 'Physical Education and Health 2']
        },
        '12': {
            '1': ['21st Century Literature', 'Contemporary Philippine Arts', 'Media and Information Literacy', 'Computer Programming (.Net Technology) NC III (Part 1)', 'Entrepreneurship', 'Physical Education and Health 3'],
            '2': ['Understanding Culture', 'Philosophy of the Human Person', 'Computer Programming (.Net Technology) NC III (Part 2)', 'Work Immersion / Culminating Activity', 'Physical Education and Health 4']
        }
    },
    'TechPro - HE': {
        '11': {
            '1': ['Oral Communication in Context', 'Komunikasyon at Pananaliksik', 'General Mathematics', 'Earth and Life Science', 'Bread and Pastry Production NC II', 'Empowerment Technologies', 'Physical Education and Health 1'],
            '2': ['Reading and Writing Skills', 'Pagbasa at Pagsusuri', 'Statistics and Probability', 'Physical Science', 'Food and Beverage Services NC II', 'Research in Daily Life 1', 'Physical Education and Health 2']
        },
        '12': {
            '1': ['21st Century Literature', 'Contemporary Philippine Arts', 'Media and Information Literacy', 'Cookery NC II (Part 1)', 'Entrepreneurship', 'Physical Education and Health 3'],
            '2': ['Understanding Culture', 'Philosophy of the Human Person', 'Cookery NC II (Part 2)', 'Work Immersion / Culminating Activity', 'Physical Education and Health 4']
        }
    }
};

let currentEnrollmentSubjects = [];

function renderEnrollment(container) {
    if (currentUser.role !== 'admin' && currentUser.role !== 'principal' && currentUser.role !== 'curriculum_coordinator') {
        container.innerHTML = `<div class="p-8 text-red-500">Access Denied. Only authorized personnel can access SHS Enrollment.</div>`;
        return;
    }

    let searchHTML = `
        <div class="mb-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col md:flex-row gap-4 items-end">
            <div class="w-full md:w-1/2 relative">
                <label class="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Search Student</label>
                <i class="fas fa-search absolute left-4 top-9 text-gray-400"></i>
                <input type="text" id="enrollment-search" placeholder="Enter Name or LRN..." 
                    class="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                    value="${enrollmentSearchTerm}"
                    oninput="enrollmentSearchTerm=this.value; filterEnrollmentSearch()">
                <div id="enrollment-search-results" class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg hidden max-h-60 overflow-y-auto"></div>
            </div>
        </div>
    `;

    let contentHTML = `
        <div class="flex flex-col items-center justify-center py-20 text-gray-400" id="enrollment-placeholder">
            <div class="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 border border-gray-100 shadow-inner">
                <i class="fas fa-user-graduate text-4xl text-gray-300"></i>
            </div>
            <h2 class="text-xl font-bold text-gray-700 mb-2">SHS Enrollment & Advising</h2>
            <p class="text-sm max-w-md text-center leading-relaxed">Search for a Senior High School student above to assign their Strand and Subjects for the current term.</p>
        </div>
        <div id="enrollment-active-ui" class="hidden animate-fade-in"></div>
    `;

    container.innerHTML = `
        <div class="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in h-full flex flex-col">
            <div class="flex items-center justify-between mb-8">
                <div>
                    <h1 class="text-3xl font-black text-gray-900 tracking-tight">SHS Enrollment</h1>
                    <p class="text-sm text-gray-500 mt-1 font-medium">Assign Curriculum Tracks and Subjects per Term</p>
                </div>
            </div>
            ${searchHTML}
            <div class="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-y-auto relative">
                ${contentHTML}
            </div>
        </div>
    `;

    if (enrollmentSelectedStudent) {
        renderEnrollmentUI();
    }
}

function filterEnrollmentSearch() {
    const term = enrollmentSearchTerm.toLowerCase();
    const resultsContainer = document.getElementById('enrollment-search-results');
    
    if (!term || term.length < 2) {
        resultsContainer.classList.add('hidden');
        return;
    }

    const matches = students.filter(s => 
        (s.name.toLowerCase().includes(term) || s.lrn.includes(term))
    ).slice(0, 8); // Limit to 8 results

    if (matches.length === 0) {
        resultsContainer.innerHTML = `<div class="px-4 py-3 text-sm text-gray-500">No students found.</div>`;
    } else {
        resultsContainer.innerHTML = matches.map(s => `
            <div class="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center transition-colors"
                 onclick="selectStudentForEnrollment('${s.lrn}')">
                <div>
                    <div class="font-bold text-gray-800">${s.name}</div>
                    <div class="text-xs text-gray-500">${s.lrn} &bull; ${s.section || 'No Section'}</div>
                </div>
                <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
            </div>
        `).join('');
    }
    resultsContainer.classList.remove('hidden');
}

function selectStudentForEnrollment(lrn) {
    enrollmentSelectedStudent = students.find(s => s.lrn === lrn);
    document.getElementById('enrollment-search').value = enrollmentSelectedStudent.name;
    document.getElementById('enrollment-search-results').classList.add('hidden');
    
    // Attempt to guess Grade from section name
    const secStr = (enrollmentSelectedStudent.section || '').toLowerCase();
    if (secStr.includes('12')) enrollmentSelectedGrade = '12';
    else enrollmentSelectedGrade = '11';

    enrollmentSelectedTerm = window.currentRecordQuarter ? String(window.currentRecordQuarter) : '1';
    
    loadTemplateSubjects();
    renderEnrollmentUI();
}

function loadTemplateSubjects() {
    const template = SHS_CURRICULUM_TEMPLATES[enrollmentSelectedTrack];
    if (template && template[enrollmentSelectedGrade] && template[enrollmentSelectedGrade][enrollmentSelectedTerm]) {
        currentEnrollmentSubjects = [...template[enrollmentSelectedGrade][enrollmentSelectedTerm]];
    } else {
        currentEnrollmentSubjects = [];
    }
}

function renderEnrollmentUI() {
    document.getElementById('enrollment-placeholder').classList.add('hidden');
    const ui = document.getElementById('enrollment-active-ui');
    ui.classList.remove('hidden');

    const s = enrollmentSelectedStudent;
    
    // Existing enrolled subjects for this term
    const targetQ = parseInt(enrollmentSelectedTerm);
    const alreadyEnrolled = s.subjects.filter(sub => parseInt(sub.quarter) === targetQ).map(sub => sub.n);

    let strandOptions = Object.keys(SHS_CURRICULUM_TEMPLATES).map(track => 
        `<option value="${track}" ${enrollmentSelectedTrack === track ? 'selected' : ''}>${track}</option>`
    ).join('');

    let enrolledBadges = alreadyEnrolled.length === 0 
        ? `<span class="text-gray-400 text-sm italic">No subjects enrolled yet for Term ${targetQ}.</span>`
        : alreadyEnrolled.map(sub => `<span class="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold shadow-sm">${sub}</span>`).join(' ');

    let templateListHTML = currentEnrollmentSubjects.length === 0
        ? `<div class="p-6 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">No template available for this selection.</div>`
        : currentEnrollmentSubjects.map((sub, idx) => `
            <div class="flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">${idx + 1}</div>
                    <span class="font-medium text-gray-800 text-sm">${sub}</span>
                </div>
                <button onclick="removeEnrollmentSubject(${idx})" class="w-8 h-8 rounded-full text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');

    ui.innerHTML = `
        <div class="flex flex-col lg:flex-row gap-8">
            <!-- Left: Student Info & Settings -->
            <div class="w-full lg:w-1/3 space-y-6">
                <!-- Profile Card -->
                <div class="bg-gradient-to-br from-primary to-primaryDark rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <div class="flex items-center gap-4 relative z-10">
                        <div class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-black shadow-inner border border-white/30">
                            ${s.name.charAt(0)}
                        </div>
                        <div>
                            <h3 class="font-bold text-lg leading-tight truncate w-48" title="${s.name}">${s.name}</h3>
                            <p class="text-white/70 text-xs mt-1 font-medium tracking-wider uppercase">${s.lrn}</p>
                            <span class="inline-block mt-2 px-2 py-0.5 bg-white/20 rounded text-[10px] font-bold uppercase tracking-widest">${s.section || 'No Section'}</span>
                        </div>
                    </div>
                </div>

                <!-- Enrollment Settings -->
                <div class="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4 shadow-inner">
                    <h4 class="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <i class="fas fa-sliders-h text-primary"></i> Curriculum Setup
                    </h4>
                    <div>
                        <label class="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Strand / Track</label>
                        <select class="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-medium shadow-sm transition-shadow"
                            onchange="enrollmentSelectedTrack = this.value; loadTemplateSubjects(); renderEnrollmentUI();">
                            ${strandOptions}
                        </select>
                    </div>
                    <div class="flex gap-4">
                        <div class="w-1/2">
                            <label class="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Grade Level</label>
                            <select class="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-medium shadow-sm transition-shadow"
                                onchange="enrollmentSelectedGrade = this.value; loadTemplateSubjects(); renderEnrollmentUI();">
                                <option value="11" ${enrollmentSelectedGrade === '11' ? 'selected' : ''}>Grade 11</option>
                                <option value="12" ${enrollmentSelectedGrade === '12' ? 'selected' : ''}>Grade 12</option>
                            </select>
                        </div>
                        <div class="w-1/2">
                            <label class="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Semester / Term</label>
                            <select class="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-medium shadow-sm transition-shadow"
                                onchange="enrollmentSelectedTerm = this.value; loadTemplateSubjects(); renderEnrollmentUI();">
                                <option value="1" ${enrollmentSelectedTerm === '1' ? 'selected' : ''}>1st Term</option>
                                <option value="2" ${enrollmentSelectedTerm === '2' ? 'selected' : ''}>2nd Term</option>
                                <option value="3" ${enrollmentSelectedTerm === '3' ? 'selected' : ''}>3rd Term</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Currently Enrolled -->
                <div class="bg-white rounded-2xl p-5 border border-green-100 shadow-sm">
                    <h4 class="text-sm font-bold text-green-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <i class="fas fa-check-circle"></i> Already Enrolled (Term ${targetQ})
                    </h4>
                    <div class="flex flex-wrap gap-2">
                        ${enrolledBadges}
                    </div>
                </div>
            </div>

            <!-- Right: Subject List -->
            <div class="w-full lg:w-2/3 flex flex-col h-full">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <i class="fas fa-book text-primary opacity-70"></i> Subjects to Enroll
                    </h3>
                    <div class="flex gap-2">
                        <button onclick="addCustomEnrollmentSubject()" class="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-sm font-bold transition-colors shadow-sm">
                            <i class="fas fa-plus mr-1"></i> Add Custom
                        </button>
                        <button onclick="enrollStudent()" id="btn-enroll-save" class="px-6 py-2 bg-primary text-white hover:bg-primaryDark rounded-xl text-sm font-bold transition-all shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 transform hover:-translate-y-0.5 active:translate-y-0">
                            <i class="fas fa-save mr-1"></i> Enroll Subjects
                        </button>
                    </div>
                </div>

                <div class="flex-1 bg-white border border-gray-200 rounded-2xl shadow-inner overflow-hidden flex flex-col">
                    <div class="p-0 overflow-y-auto max-h-[500px]">
                        ${templateListHTML}
                    </div>
                    ${currentEnrollmentSubjects.length > 0 ? `
                        <div class="p-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 font-medium text-center">
                            Total Subjects: ${currentEnrollmentSubjects.length}
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function removeEnrollmentSubject(idx) {
    currentEnrollmentSubjects.splice(idx, 1);
    renderEnrollmentUI();
}

function addCustomEnrollmentSubject() {
    const sub = prompt("Enter the name of the custom subject:");
    if (sub && sub.trim()) {
        currentEnrollmentSubjects.push(sub.trim());
        renderEnrollmentUI();
    }
}

async function enrollStudent() {
    if (!enrollmentSelectedStudent) return;
    if (currentEnrollmentSubjects.length === 0) {
        showMessage("No subjects to enroll.", true);
        return;
    }

    const btn = document.getElementById('btn-enroll-save');
    btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i> Saving...`;
    btn.disabled = true;
    btn.classList.add('opacity-75');

    const s = enrollmentSelectedStudent;
    const targetQ = parseInt(enrollmentSelectedTerm);
    const sy = window.currentRecordSchoolYear || '2025-2026';

    let successCount = 0;
    
    // We send a grade save request for each subject with null scores to initialize them in the database!
    for (const sub of currentEnrollmentSubjects) {
        try {
            // Check if already exists in frontend state
            let subObj = s.subjects.find(x => x.n === sub && parseInt(x.quarter) === targetQ);
            
            await fetch('/api/grades/save-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ 
                    lrn: s.lrn, 
                    subject: sub, 
                    scores: {}, // Empty scores
                    grade: subObj ? subObj.g : null, 
                    gwa: s.gwa ?? null, 
                    quarter: targetQ, 
                    school_year: sy 
                })
            });

            // Update frontend state immediately
            if (!subObj) {
                s.subjects.push({ n: sub, g: null, quarter: targetQ });
            }
            successCount++;
        } catch (e) {
            console.error("Failed to enroll subject:", sub, e);
        }
    }

    showMessage(`Successfully enrolled ${successCount} subjects for Term ${targetQ}.`);
    
    // Force re-render to show badges
    renderEnrollmentUI();
    
    btn.innerHTML = `<i class="fas fa-save mr-1"></i> Enroll Subjects`;
    btn.disabled = false;
    btn.classList.remove('opacity-75');
}
