/**
 * admin/assignSection.js — Assign Year/Section Page
 * Manages sections (name + year + strand) stored in localStorage.
 * Assign students from the masterlist to a section via search or AI photo scan.
 */

// ─── State ───────────────────────────────────────────────────────────────────
let _sections = [];
let _selectedSection = null;
let _assignStudentSearch = '';
let _sectionFilter = 'ALL';
let _schoolYearFilter = '2025-2026';
let _sectionSearch = '';
let _enrolledStudentSearch = '';

async function setSchoolYearFilter(sy) {
    _schoolYearFilter = sy;
    try {
        const res = await fetch('/api/students?school_year=' + sy, { headers: { 'Accept': 'application/json' } });
        if (res.ok) students = await res.json();
    } catch (e) { console.error(e); }
    renderAssignSection(document.getElementById('content-area'));
}

function setSectionFilter(filter) {
    _sectionFilter = filter;
    renderAssignSection(document.getElementById('content-area'));
}

function searchSections(val) {
    _sectionSearch = val.toLowerCase();
    renderAssignSection(document.getElementById('content-area'));
}

const SECTIONS_KEY = 'cnhs_sections';

function _saveSections() {
    localStorage.setItem(SECTIONS_KEY, JSON.stringify(_sections));
}

function _loadSections() {
    try {
        const raw = localStorage.getItem(SECTIONS_KEY);
        _sections = raw ? JSON.parse(raw) : [];
    } catch { _sections = []; }

    // Dynamically merge sections from the students database to sync across devices
    if (typeof students !== 'undefined' && Array.isArray(students)) {
        const dbSections = [...new Set(students.map(s => s.section).filter(Boolean))];
        dbSections.forEach(sectionName => {
            if (!_sections.find(s => s.name === sectionName)) {
                // Determine year based on section name if possible, default to something generic
                let yearStr = 'Grade 7'; // fallback
                const match = sectionName.match(/\b([7-9]|1[0-2])\b/);
                if (match) yearStr = 'Grade ' + match[1];

                _sections.push({
                    id: 'sec_db_' + sectionName.replace(/\s+/g, '_'),
                    name: sectionName,
                    year: yearStr,
                    strand: null,
                    schoolYear: _schoolYearFilter || '2025-2026'
                });
            }
        });
        _saveSections();
    }
}

// ─── Main Render ──────────────────────────────────────────────────────────────
function renderAssignSection(container) {
    _loadSections();
    _selectedSection = _selectedSection && _sections.find(s => s.id === _selectedSection.id) || null;

    const yearColors = {
        'Grade 7': 'bg-blue-100 text-blue-700',
        'Grade 8': 'bg-indigo-100 text-indigo-700',
        'Grade 9': 'bg-purple-100 text-purple-700',
        'Grade 10': 'bg-pink-100 text-pink-700',
        'Grade 11': 'bg-amber-100 text-amber-700',
        'Grade 12': 'bg-green-100 text-green-700',
    };

    const jhCount = _sections.filter(s => parseInt((s.year || '').replace(/\D/g, '')) <= 10).length;
    const shCount = _sections.filter(s => parseInt((s.year || '').replace(/\D/g, '')) >= 11).length;

    const filteredSections = _sections.filter(sec => {
        const gradeNum = parseInt((sec.year || '').replace(/\D/g, '')) || 0;
        let matchesFilter = true;
        
        if (currentUser.role === 'curriculum_coordinator') {
            if (currentUser.department === 'JHS') matchesFilter = gradeNum <= 10;
            else if (currentUser.department === 'SHS') matchesFilter = gradeNum >= 11;
        } else {
            if (_sectionFilter === 'JH') matchesFilter = gradeNum <= 10;
            if (_sectionFilter === 'SH') matchesFilter = gradeNum >= 11;
        }

        const matchesYear = !sec.schoolYear || sec.schoolYear === _schoolYearFilter;
        const matchesSearch = _sectionSearch === '' || (sec.name || '').toLowerCase().includes(_sectionSearch);
        return matchesFilter && matchesYear && matchesSearch;
    });

    let filterTabsHtml = '<div class="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1 shrink-0">';
    if (currentUser.role !== 'curriculum_coordinator') {
        filterTabsHtml += '<button onclick="setSectionFilter(\'ALL\')" class="flex-1 py-2.5 text-xs tracking-wider font-bold rounded-lg transition ' + (_sectionFilter === 'ALL' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-gray-700 bg-transparent') + '">All Sections</button>' +
        '<button onclick="setSectionFilter(\'JH\')" class="flex-1 py-2.5 text-xs tracking-wider font-bold rounded-lg transition ' + (_sectionFilter === 'JH' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-gray-700 bg-transparent') + '">JHS (' + jhCount + ')</button>' +
        '<button onclick="setSectionFilter(\'SH\')" class="flex-1 py-2.5 text-xs tracking-wider font-bold rounded-lg transition ' + (_sectionFilter === 'SH' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-gray-700 bg-transparent') + '">SHS (' + shCount + ')</button>';
    } else if (currentUser.department === 'JHS') {
        filterTabsHtml += '<button class="flex-1 py-2.5 text-xs tracking-wider font-bold rounded-lg transition bg-primary text-white shadow-md">JHS (' + jhCount + ')</button>';
    } else if (currentUser.department === 'SHS') {
        filterTabsHtml += '<button class="flex-1 py-2.5 text-xs tracking-wider font-bold rounded-lg transition bg-primary text-white shadow-md">SHS (' + shCount + ')</button>';
    }
    filterTabsHtml += '</div>';

    let sysArray = ['2024-2025', '2025-2026', '2026-2027', '2027-2028'];
    if (typeof globalSettings !== 'undefined' && globalSettings.school_years) {
        try {
            let parsed = JSON.parse(globalSettings.school_years);
            if (Array.isArray(parsed) && parsed.length > 0) sysArray = parsed;
        } catch(e){}
    }

    let defaultYears = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
    if (typeof globalSettings !== 'undefined' && globalSettings.system_lists) {
        try {
            let parsed = JSON.parse(globalSettings.system_lists);
            if (parsed.grade_levels && Array.isArray(parsed.grade_levels) && parsed.grade_levels.length > 0) defaultYears = parsed.grade_levels;
        } catch(e){}
    }

    let yearOptions = [...defaultYears];
    let strandOptionsHtml = SH_STRANDS.map(s => '<option value="' + s + '">' + s + '</option>').join('');

    if (currentUser.role === 'curriculum_coordinator') {
        if (currentUser.department === 'SHS' && currentUser.strand) {
            strandOptionsHtml = '<option value="' + currentUser.strand + '" selected>' + currentUser.strand + ' Track</option>';
        }
    }

    const sectionListHtml = filteredSections.length === 0
        ? '<div class="py-10 text-center text-gray-400 text-sm italic">No sections found.</div>'
        : filteredSections.map(sec => {
            const isSelected = _selectedSection && _selectedSection.id === sec.id;
            const yc = yearColors[sec.year] || 'bg-gray-100 text-gray-600';
            const enrolled = students.filter(s => s.section === (sec.name || '')).length;

            return '<button onclick="selectSection(\'' + sec.id + '\')" class="group w-full text-left p-4 rounded-2xl mb-3 border transition-all ' +
                (isSelected ? 'border-primary bg-green-50 shadow-md ring-1 ring-primary/20' : 'border-gray-100 bg-white hover:border-primary/30 hover:shadow-md') + '">' +
                '<div class="flex items-center justify-between gap-4 mb-2">' +
                '<p class="font-black text-gray-800 text-lg tracking-tight truncate">' + (sec.name || 'Unnamed Section') + '</p>' +
                '<span class="px-2.5 py-1 rounded-md text-[10px] font-bold ' + yc.replace('bg-', 'bg-white border-').replace('text-', 'text-') + ' border shadow-sm">' + (sec.year || '') + '</span>' +
                '</div>' +
                '<div class="flex items-center justify-between">' +
                '<div class="flex items-center gap-2">' +
                '<span class="w-2 h-2 rounded-full ' + (enrolled > 0 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-300') + '"></span>' +
                '<p class="text-[11px] text-gray-500 font-medium tracking-wide">' + enrolled + ' student' + (enrolled !== 1 ? 's' : '') + '</p>' +
                '</div>' +
                '<div class="flex items-center gap-2">' +
                (sec.strand ? '<span class="px-2 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-gray-500 uppercase">' + sec.strand + '</span>' : '') +
                '<div onclick="event.stopPropagation(); deleteSection(\'' + sec.id + '\')" class="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition text-xs shadow-sm bg-white border border-red-100 ml-1" title="Delete Section">' +
                '<i class="fas fa-trash"></i>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</button>';
        }).join('');

    const rightPanel = _selectedSection
        ? _buildSectionDetailPanel(_selectedSection)
        : '<div class="flex flex-col items-center justify-center h-full py-20 text-gray-300">' +
        '<i class="fas fa-layer-group text-6xl mb-4"></i>' +
        '<p class="text-sm font-semibold">Select a section to manage students</p>' +
        '</div>';

    container.innerHTML =
        '<div class="animate-fade-in max-w-6xl mx-auto">' +
        '<div class="mb-6 flex justify-between items-end">' +
        '<div>' +
        '<h2 class="text-2xl font-bold text-gray-800 tracking-tight">Assign Section</h2>' +
        '<p class="text-sm text-gray-400 mt-1">Create sections and assign students to them.</p>' +
        '</div>' +
        '<div class="flex items-center gap-3">' +
        '<button onclick="openAddSectionModal()" class="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primaryDark transition shadow-md">' +
        '<i class="fas fa-plus"></i> Add Section' +
        '</button>' +
        '<div class="flex flex-col items-end">' +
        '<label class="text-[9px] font-bold text-gray-400 uppercase mb-1">School Year</label>' +
        '<select onchange="setSchoolYearFilter(this.value)" class="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold shadow-sm focus:border-primary outline-none cursor-pointer">' +
        sysArray.map(sy => `<option value="${sy}" ${_schoolYearFilter === sy ? 'selected' : ''}>S.Y. ${sy}</option>`).join('') +
        '</select>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="grid grid-cols-1 lg:grid-cols-12 gap-8">' +
        '<!-- Section list -->' +
        '<div class="lg:col-span-5 flex flex-col gap-4 max-h-[80vh] min-h-[500px] animate-slide-up">' +
        // Filter Tabs
        filterTabsHtml +
        // Search Box
        '<div class="relative shrink-0">' +
        '<i class="fas fa-search absolute left-4 top-3.5 text-gray-300 text-sm"></i>' +
        '<input type="text" value="' + (_sectionSearch || '') + '" oninput="searchSections(this.value)" placeholder="Search section by name..." class="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 bg-white shadow-sm transition">' +
        '</div>' +
        // List
        '<div class="flex-1 overflow-y-auto pr-2 pb-10 custom-scrollbar">' +
        sectionListHtml +
        '</div>' +
        '</div>' +
        '<!-- Right detail panel -->' +
        '<div id="section-detail-panel" class="lg:col-span-7 bg-white rounded-3xl shadow-sm border border-gray-100 min-h-[75vh] animate-slide-up">' +
        rightPanel +
        '</div>' +
        '</div>' +
        '</div>' +

        
        '<!-- Add Section Modal -->' +
        '<div id="add-section-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">' +
        '<div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 animate-scale-up">' +
        '<h3 class="text-lg font-bold text-gray-800 mb-5">Add New Section</h3>' +
        '<div class="space-y-4">' +
        '<div>' +
        '<label class="text-xs font-bold text-gray-500 uppercase block mb-1.5">Section Name</label>' +
        '<input id="new-sec-name" type="text" placeholder="e.g. 7-Einstein" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-primary bg-gray-50 outline-none transition" onkeypress="if(event.key===\'Enter\') saveNewSection()">' +
        '</div>' +
        '<div>' +
        '<label class="text-xs font-bold text-gray-500 uppercase block mb-1.5">Year Level</label>' +
        '<select id="new-sec-year" onchange="toggleSectionStrandField()" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary bg-white">' +
        '<option value="" disabled selected>-- Select Year Level --</option>' +
        yearOptions.map(y => '<option value="' + y + '">' + y + '</option>').join('') +
        '</select>' +
        '</div>' +
        '<div id="new-sec-strand-wrap" class="hidden">' +
        '<label class="text-xs font-bold text-gray-500 uppercase block mb-1.5">Strand / Track</label>' +
        '<select id="new-sec-strand" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary bg-white">' +
        strandOptionsHtml +
        '</select>' +
        '</div>' +
        '</div>' +
        '<div class="flex gap-3 mt-6">' +
        '<button onclick="saveNewSection()" class="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primaryDark transition">Save Section</button>' +
        '<button onclick="closeAddSectionModal()" class="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition">Cancel</button>' +
        '</div>' +
        '</div>' +
        '</div>' +

        '<!-- AI Scan Modal for section student import -->' +
        '<div id="assign-scan-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">' +
        '<div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-scale-up">' +
        '<div class="flex justify-between items-center mb-6">' +
        '<div><h3 class="text-lg font-bold text-gray-800">AI Student Scan</h3><p class="text-xs text-gray-400 mt-1">Upload class list photo to auto-detect students</p></div>' +
        '<button onclick="closeAssignScanModal()" class="w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition text-sm"><i class="fas fa-times"></i></button>' +
        '</div>' +
        '<label for="assign-scan-upload" class="block cursor-pointer">' +
        '<div class="w-full h-44 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden relative hover:border-primary transition group">' +
        '<img id="assign-scan-preview" src="" class="hidden w-full h-full object-contain">' +
        '<div id="assign-scan-placeholder" class="flex flex-col items-center justify-center gap-3 group-hover:opacity-60 transition">' +
        '<i class="fas fa-file-image text-4xl text-gray-300"></i>' +
        '<p class="text-xs text-gray-400">Click to upload class list image</p>' +
        '<p class="text-[10px] text-gray-300">Supports JPG, PNG, WebP</p>' +
        '</div>' +
        '</div>' +
        '<input type="file" id="assign-scan-upload" class="hidden" accept="image/*" onchange="handleAssignScanPreview(this)">' +
        '</label>' +
        '<div id="assign-scan-status" class="hidden mt-4 bg-green-50 rounded-xl p-4 flex items-center gap-3 border border-green-200">' +
        '<div class="spinner shrink-0"></div>' +
        '<div><p class="text-xs font-bold text-primary">AI Processing...</p><p class="text-[10px] text-gray-400">Extracting student names from image</p></div>' +
        '</div>' +
        '<button id="assign-scan-btn" onclick="processAssignScan()" disabled class="mt-4 w-full py-3.5 bg-primary text-white rounded-xl font-bold text-sm transition shadow-md hover:bg-primaryDark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">' +
        '<i class="fas fa-brain"></i> Extract Students with AI' +
        '</button>' +
        '<div id="assign-scan-results" class="hidden mt-4"></div>' +
        '</div>' +
        '</div>' +
        '<!-- Confirmation Modal -->' +
        '<div id="custom-confirm-modal" class="hidden fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">' +
        '<div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 animate-scale-up">' +
        '<h3 id="confirm-modal-title" class="text-lg font-bold text-gray-800 mb-2">Confirm Action</h3>' +
        '<p id="confirm-modal-msg" class="text-sm text-gray-500 mb-6"></p>' +
        '<div class="flex gap-3">' +
        '<button id="confirm-modal-yes" onclick="if(window._confirmCallback) window._confirmCallback(); closeConfirmModal();" class="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition shadow-sm">Confirm</button>' +
        '<button onclick="closeConfirmModal()" class="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition">Cancel</button>' +
        '</div>' +
        '</div>' +
        '</div>';
}

function _buildEnrolledSearchResults(sec, searchStr) {
    let enrolled = students.filter(s => s.section === sec.name);
    if (searchStr) {
        enrolled = enrolled.filter(s => s.name.toLowerCase().includes(searchStr) || String(s.lrn).includes(searchStr));
    }

    if (enrolled.length === 0) {
        return '<p class="text-center text-gray-400 italic text-sm py-6">No enrolled students found.</p>';
    }

    let selectAllHtml = '<div class="flex items-center gap-3 px-2 py-1.5 mb-1 bg-gray-50 rounded-lg">' +
        '<input type="checkbox" id="cb-select-all" onclick="toggleSelectAllStudents(this)" class="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer">' +
        '<label for="cb-select-all" class="text-[10px] font-bold text-gray-500 uppercase cursor-pointer">Select All</label>' +
        '</div>';

    return selectAllHtml + '<div class="divide-y divide-gray-50">' +
        enrolled.map(s =>
            '<div class="flex items-center justify-between py-2.5 px-1 hover:bg-gray-50 rounded-xl transition group">' +
            '<div class="flex items-center gap-3">' +
            '<input type="checkbox" value="' + s.lrn + '" class="student-select-cb w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary ml-1 cursor-pointer" onchange="toggleRemoveSelectedBtn()">' +
            '<div>' +
            '<p class="text-sm font-bold text-gray-800">' + s.name + '</p>' +
            '<p class="text-[10px] font-mono text-gray-400">LRN: ' + s.lrn + '</p>' +
            '</div>' +
            '</div>' +
            '<button onclick="removeStudentFromSection(\'' + s.lrn + '\')" class="px-3 py-1 bg-red-50 text-red-500 rounded-lg text-[10px] font-bold hover:bg-red-100 transition opacity-0 group-hover:opacity-100">' +
            '<i class="fas fa-user-minus mr-1"></i>Remove' +
            '</button>' +
            '</div>'
        ).join('') +
        '</div>';
}

function searchEnrolledStudents(val) {
    _enrolledStudentSearch = val.trim().toLowerCase();
    if (!_selectedSection) return;
    const container = document.getElementById('enrolled-search-results');
    if (container) {
        container.innerHTML = _buildEnrolledSearchResults(_selectedSection, _enrolledStudentSearch);
    }
}

// ─── Section Detail Panel ─────────────────────────────────────────────────────
function _buildSectionDetailPanel(sec) {
    const enrolledTotalOptions = students.filter(s => s.section === sec.name).length;
    const enrolledHtml = _buildEnrolledSearchResults(sec, _enrolledStudentSearch);

    return '<div class="p-8 h-full flex flex-col">' +
        '<div class="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">' +
        '<div>' +
        '<div class="flex items-center gap-3 mb-1.5">' +
        '<h3 class="text-3xl font-black text-gray-800 tracking-tight">' + sec.name + '</h3>' +
        '<span class="px-2.5 py-1 rounded bg-gray-100 text-[10px] font-bold text-gray-500 uppercase">' + (sec.strand || (sec.year || '')) + '</span>' +
        '</div>' +
        '<p class="text-sm font-bold text-gray-400">' + enrolledTotalOptions + ' student' + (enrolledTotalOptions !== 1 ? 's' : '') + ' enrolled</p>' +
        '</div>' +
        '<div class="flex items-center gap-2">' +
        '<button onclick="printSectionMasterlist(\'' + sec.name + '\')" class="flex items-center gap-2.5 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-100 transition border border-blue-200 shadow-sm">' +
        '<i class="fas fa-print text-sm"></i> Print' +
        '</button>' +
        '<button onclick="openAssignScanModal()" class="flex items-center gap-2 px-5 py-2.5 bg-green-50 text-green-700 rounded-xl text-sm font-extrabold hover:bg-green-100 transition border border-green-200 shadow-sm">' +
        '<i class="fas fa-camera text-base"></i> AI Camera Scan' +
        '</button>' +
        '</div>' +
        '</div>' +

        '<!-- Search & add students -->' +
        '<div class="mb-8">' +
        '<label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Assign Student from Masterlist</label>' +
        '<div class="relative">' +
        '<i class="fas fa-search absolute left-4 top-3.5 text-gray-300 text-sm"></i>' +
        '<input type="text" id="assign-search-input" value="' + (_assignStudentSearch || '') + '" oninput="searchAssignStudents(this.value)" placeholder="Search name or LRN..." class="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 bg-gray-50 focus:bg-white transition">' +
        '</div>' +
        '<div id="assign-search-results">' + _buildAssignSearchResults(sec, _assignStudentSearch) + '</div>' +
        '</div>' +

        '<!-- Enrolled students -->' +
        '<div class="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col">' +
        '<div class="flex items-center justify-between mb-3">' +
        '<div class="flex items-center gap-3">' +
        '<label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Currently Enrolled (' + enrolledTotalOptions + ')</label>' +
        (enrolledTotalOptions > 0 ? '<button id="btn-remove-selected" onclick="removeSelectedStudents()" class="hidden text-[10px] font-bold text-orange-500 hover:text-orange-700 hover:underline transition uppercase tracking-wider">Remove Selected (<span id="selected-count">0</span>)</button>' : '') +
        (enrolledTotalOptions > 0 ? '<button onclick="removeAllStudentsFromSection()" class="text-[10px] font-bold text-red-500 hover:text-red-700 hover:underline transition uppercase tracking-wider">Remove All</button>' : '') +
        '</div>' +
        '<div class="relative w-48">' +
        '<i class="fas fa-search absolute left-3 top-2.5 text-gray-300 text-[10px]"></i>' +
        '<input type="text" id="enrolled-search-input" value="' + (_enrolledStudentSearch || '') + '" oninput="searchEnrolledStudents(this.value)" placeholder="Search enrolled..." class="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 bg-gray-50 focus:bg-white transition">' +
        '</div>' +
        '</div>' +
        '<div id="enrolled-search-results">' + enrolledHtml + '</div>' +
        '</div>' +
        '</div>';
}

// ─── Print Masterlist ─────────────────────────────────────────────────────────
function printSectionMasterlist(sectionName) {
    const enrolled = students.filter(s => s.section === sectionName).sort((a, b) => a.name.localeCompare(b.name));

    let printWin = window.open('', '_blank');
    if (!printWin) return showMessage('Popup blocker prevented printing. Allow popups for this site.', true);

    let html = `
    <html>
    <head>
        <title>Masterlist - ${sectionName}</title>
        <style>
            body { font-family: 'Arial', sans-serif; margin: 40px; color: #333; }
            h2 { text-align: center; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
            p { text-align: center; color: #666; font-size: 14px; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th, td { border: 1px solid #ccc; padding: 12px; text-align: left; }
            th { background-color: #f8f9fa; font-weight: bold; text-transform: uppercase; font-size: 13px; }
            td { font-size: 14px; }
            .index { width: 40px; text-align: center; font-weight: bold; color: #777; }
        </style>
    </head>
    <body>
        <h2>Class Masterlist: ${sectionName}</h2>
        <p>Total Enrolled: ${enrolled.length}</p>
        
        <table>
            <thead>
                <tr>
                    <th class="index">#</th>
                    <th style="width:25%">Learner Reference Number (LRN)</th>
                    <th>Full Name</th>
                    <th style="width:20%">Status</th>
                </tr>
            </thead>
            <tbody>
                ${enrolled.map((s, i) => `
                <tr>
                    <td class="index">${i + 1}</td>
                    <td style="font-family: monospace;">${s.lrn}</td>
                    <td><b>${s.name}</b></td>
                    <td>${s.status || 'Active'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        
        <script>
            window.onload = function() { window.print(); }
        </script>
    </body>
    </html>
    `;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
}

// ─── Section CRUD ─────────────────────────────────────────────────────────────
function openAddSectionModal() {
    document.getElementById('add-section-modal').classList.remove('hidden');
    document.getElementById('new-sec-name').value = '';
    document.getElementById('new-sec-year').value = '';
    document.getElementById('new-sec-strand-wrap').classList.add('hidden');
    setTimeout(() => document.getElementById('new-sec-name').focus(), 50);
}

function closeAddSectionModal() {
    document.getElementById('add-section-modal').classList.add('hidden');
}

function toggleSectionStrandField() {
    const year = document.getElementById('new-sec-year').value;
    const isSH = year === 'Grade 11' || year === 'Grade 12';
    document.getElementById('new-sec-strand-wrap').classList.toggle('hidden', !isSH);
}

function saveNewSection() {
    const name = (document.getElementById('new-sec-name').value || '').trim();
    const year = document.getElementById('new-sec-year').value;
    if (!name) return showMessage('Section name is required.', true);
    if (!year) return showMessage('Please select a year level.', true);
    if (_sections.find(s => s.name.toLowerCase() === name.toLowerCase())) {
        return showMessage('A section with this name already exists.', true);
    }
    const isSH = year === 'Grade 11' || year === 'Grade 12';
    const strand = isSH ? (document.getElementById('new-sec-strand').value || null) : null;
    _sections.push({ id: 'sec_' + Date.now(), name, year, strand, schoolYear: _schoolYearFilter });
    _saveSections();
    closeAddSectionModal();
    logActivity('Admin created section: ' + name + ' (' + year + ')');
    showMessage('Section "' + name + '" created.');
    renderAssignSection(document.getElementById('content-area'));
}

function deleteSection(id) {
    const sec = _sections.find(s => s.id === id);
    if (!sec) return;
    openConfirmModal('Delete Section', 'Delete section "' + sec.name + '"? Students will be unassigned.', () => {
        _sections = _sections.filter(s => s.id !== id);
        _saveSections();
        if (_selectedSection && _selectedSection.id === id) _selectedSection = null;
        logActivity('Admin deleted section: ' + sec.name);
        showMessage('Section removed.');
        renderAssignSection(document.getElementById('content-area'));
    });
}

function selectSection(id) {
    _selectedSection = _sections.find(s => s.id === id) || null;
    _assignStudentSearch = '';
    renderAssignSection(document.getElementById('content-area'));
}

// ─── Student Assignment ───────────────────────────────────────────────────────
function _buildAssignSearchResults(sec, search) {
    const searchVal = search.toLowerCase();

    // Allow assigned students to be discovered to support re-assigning/moving them across scope. Unfilter except active housing duplicate.
    const available = students.filter(s => s.section !== sec.name);

    const searchResults = searchVal.length >= 1
        ? available.filter(s =>
            s.name.toLowerCase().includes(searchVal) ||
            String(s.lrn).includes(searchVal)
        ).slice(0, 8)
        : [];

    return searchVal.length >= 1
        ? (searchResults.length === 0
            ? '<p class="text-xs text-gray-400 italic p-2">No matching unassigned students found. (If a student is already in another section, remove them first).</p>'
            : '<div class="mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-sm">' +
            searchResults.map(s =>
                '<button onclick="assignStudentToSection(\'' + s.lrn + '\')" class="w-full flex items-center justify-between px-4 py-2.5 hover:bg-green-50 transition text-left border-b border-gray-100 last:border-b-0">' +
                '<div>' +
                '<p class="text-sm font-bold text-gray-800">' + s.name + '</p>' +
                '<p class="text-[10px] font-mono text-gray-400">LRN: ' + s.lrn + '</p>' +
                '</div>' +
                '<span class="text-xs text-primary font-bold flex items-center gap-1"><i class="fas fa-user-plus"></i> Assign</span>' +
                '</button>'
            ).join('') +
            '</div>')
        : '';
}

function searchAssignStudents(val) {
    _assignStudentSearch = val;
    const resultsContainer = document.getElementById('assign-search-results');
    if (resultsContainer && _selectedSection) {
        resultsContainer.innerHTML = _buildAssignSearchResults(_selectedSection, val);
    }
}

async function assignStudentToSection(lrn) {
    if (!_selectedSection) return;
    const student = students.find(s => String(s.lrn) === String(lrn));
    if (!student) return;

    // Promotion / Re-Assignment check: Reassign if already housed
    if (student.section && student.section !== _selectedSection.name) {
        if (!confirm('Student is currently assigned to ' + student.section + '. Do you want to enroll/promote them to ' + _selectedSection.name + ' for ' + _schoolYearFilter + '?')) {
            return;
        }
    }

    try {
        const res = await fetch('/api/students/' + (student.id || lrn), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ section: _selectedSection.name, school_year: _schoolYearFilter })
        });
        if (!res.ok) { showMessage('Failed to assign student.', true); return; }
        student.section = _selectedSection.name;
        _assignStudentSearch = '';
        logActivity('Assigned ' + student.name + ' to section ' + _selectedSection.name);
        showMessage(student.name + ' assigned to ' + _selectedSection.name + '.');
        renderAssignSection(document.getElementById('content-area'));
    } catch {
        showMessage('Network error.', true);
    }
}

async function removeStudentFromSection(lrn) {
    const student = students.find(s => s.lrn === lrn);
    if (!student) return;

    openConfirmModal('Remove Student', 'Remove ' + student.name + ' from this section?', async () => {
        try {
            const res = await fetch('/api/students/' + (student.id || lrn), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ section: null, school_year: _schoolYearFilter })
            });
            if (!res.ok) { showMessage('Failed to remove student.', true); return; }
            student.section = null;
            logActivity('Removed ' + student.name + ' from section ' + _selectedSection.name);
            showMessage(student.name + ' removed from section.');
            renderAssignSection(document.getElementById('content-area'));
        } catch {
            showMessage('Network error.', true);
        }
    });
}

let _assignScanBase64 = null;
let _pendingAssignScan = [];

function openAssignScanModal() {
    _assignScanBase64 = null;
    _pendingAssignScan = [];
    document.getElementById('assign-scan-modal').classList.remove('hidden');
    document.getElementById('assign-scan-preview').classList.add('hidden');
    document.getElementById('assign-scan-placeholder').classList.remove('hidden');
    document.getElementById('assign-scan-status').classList.add('hidden');
    document.getElementById('assign-scan-btn').disabled = true;
    document.getElementById('assign-scan-btn').classList.remove('hidden');
    document.getElementById('assign-scan-results').classList.add('hidden');
    document.getElementById('assign-scan-results').innerHTML = '';
    document.getElementById('assign-scan-upload').value = '';
}

function closeAssignScanModal() {
    document.getElementById('assign-scan-modal').classList.add('hidden');
}

function handleAssignScanPreview(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const cvs = document.createElement('canvas');
            const ctx = cvs.getContext('2d');
            const SCALE = 1024;
            let w = img.width, h = img.height;

            if (w > h) {
                if (w > SCALE) { h *= SCALE / w; w = SCALE; }
            } else {
                if (h > SCALE) { w *= SCALE / h; h = SCALE; }
            }

            cvs.width = w;
            cvs.height = h;
            ctx.drawImage(img, 0, 0, w, h);

            const dataUrl = cvs.toDataURL('image/jpeg', 0.8);
            _assignScanBase64 = dataUrl; // callGemini expects full data url so it can split it

            document.getElementById('assign-scan-preview').src = dataUrl;
            document.getElementById('assign-scan-preview').classList.remove('hidden');
            document.getElementById('assign-scan-placeholder').classList.add('hidden');
            document.getElementById('assign-scan-btn').disabled = false;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function processAssignScan() {
    if (!_assignScanBase64) return;
    if (!_selectedSection) { showMessage('Please select a section first.', true); return; }

    document.getElementById('assign-scan-status').classList.remove('hidden');
    document.getElementById('assign-scan-btn').disabled = true;
    document.getElementById('assign-scan-results').classList.add('hidden');

    const prompt = 'You are analyzing an image of a class list or student roster. ' +
        'Extract all student names you can find. For each student, try to identify their LRN (Learner Reference Number, 8–12 digits) if visible. ' +
        'Return a JSON array of objects: [{"name": "Last, First MI", "lrn": "12345678"}]. ' +
        'If no LRN is found for a student, omit the lrn field. Only return the JSON array, no extra text.';

    try {
        const raw = await callGemini(prompt, _assignScanBase64);
        let students_found = [];
        try {
            const cleaned = raw.replace(/```json|```/g, '').trim();
            students_found = JSON.parse(cleaned);
        } catch {
            try {
                const m = raw.match(/\[[\s\S]*\]/);
                if (m) students_found = JSON.parse(m[0]);
            } catch { students_found = []; }
        }

        document.getElementById('assign-scan-status').classList.add('hidden');
        _renderAssignScanResults(students_found);
    } catch (err) {
        document.getElementById('assign-scan-status').classList.add('hidden');
        document.getElementById('assign-scan-btn').disabled = false;
        showMessage('AI scan failed. Please try again.', true);
    }
}

function _renderAssignScanResults(found) {
    const resultsDiv = document.getElementById('assign-scan-results');
    resultsDiv.classList.remove('hidden');

    if (!found || found.length === 0) {
        resultsDiv.innerHTML = '<p class="text-xs text-red-500 italic text-center py-2">No students detected. Try a clearer image.</p>';
        document.getElementById('assign-scan-btn').disabled = false;
        return;
    }

    _pendingAssignScan = found;

    let createCount = 0;
    let assignCount = 0;
    let alreadyCount = 0;

    const rows = found.map((f, i) => {
        let matched = null;
        if (f.lrn) matched = students.find(s => String(s.lrn) === String(f.lrn));
        if (!matched && f.name) {
            const searchName = f.name.toLowerCase().split(',')[0].trim();
            matched = students.find(s => s.name.toLowerCase().includes(searchName));
        }

        const alreadyInSection = matched && matched.section === _selectedSection.name;

        let statusBadge = '';
        if (alreadyInSection) {
            alreadyCount++;
            statusBadge = '<span class="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-bold">Already in section</span>';
        } else if (matched) {
            assignCount++;
            statusBadge = '<span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold border border-blue-100">Move Section</span>';
        } else {
            createCount++;
            statusBadge = '<span class="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-bold border border-green-100">New (Create)</span>';
        }

        const lrnDisplay = f.lrn || (matched ? matched.lrn : '<span class="italic text-gray-300">Auto-generate</span>');
        const nameDisplay = matched ? matched.name : (f.name || 'Unknown');

        f._matchedData = matched;

        return '<div class="flex items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-b-0">' +
            '<div class="flex-1 min-w-0">' +
            '<p class="text-sm font-bold text-gray-800 truncate">' + nameDisplay + '</p>' +
            '<p class="text-[10px] font-mono text-gray-400">LRN: ' + lrnDisplay + '</p>' +
            '</div>' +
            '<div class="flex items-center gap-2 shrink-0">' +
            statusBadge +
            '</div>' +
            '</div>';
    }).join('');

    resultsDiv.innerHTML =
        '<p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Detected ' + found.length + ' student(s)</p>' +
        '<div class="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-white shadow-inner mb-4">' +
        rows +
        '</div>' +
        '<div class="flex flex-col gap-2">' +
        '<button onclick="confirmAssignScan()" class="w-full py-3.5 bg-green-600 text-white rounded-xl font-bold text-sm transition shadow-md hover:bg-green-700 flex items-center justify-center gap-2">' +
        '<i class="fas fa-check-circle"></i> Confirm & Enroll ' + (assignCount + createCount) + ' Students' +
        '</button>' +
        '<p class="text-[10px] text-gray-500 text-center leading-tight mt-1 mb-2">New students will be auto-generated in masterlist.<br>Existing students will be moved/promoted to this section.</p>' +
        '</div>';

    document.getElementById('assign-scan-btn').classList.add('hidden');
}

async function confirmAssignScan() {
    if (!_pendingAssignScan || _pendingAssignScan.length === 0 || !_selectedSection) return;

    const resultsDiv = document.getElementById('assign-scan-results');
    resultsDiv.innerHTML = '<div class="flex flex-col items-center justify-center p-6 gap-3"><div class="spinner border-primary"></div><p class="text-sm font-bold text-primary">Enrolling and Updating Masterlist...</p></div>';

    let successCount = 0;

    const promises = _pendingAssignScan.map(async (f) => {
        try {
            if (f._matchedData) {
                if (f._matchedData.section === _selectedSection.name) return;
                await fetch('/api/students/' + (f._matchedData.id || f._matchedData.lrn), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ section: _selectedSection.name, school_year: _schoolYearFilter })
                });
                f._matchedData.section = _selectedSection.name;
                successCount++;
            } else {
                const randomLrn = f.lrn || Math.floor(10000000 + Math.random() * 90000000).toString();
                const res = await fetch('/api/students', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ lrn: randomLrn, name: f.name || 'Unknown', section: _selectedSection.name, adviser: 'Pending Assignment' })
                });
                if (res.ok) {
                    const saved = await res.json();
                    students.push({
                        id: saved.id,
                        lrn: saved.lrn,
                        name: saved.name,
                        section: saved.section,
                        adviser: saved.adviser,
                        gwa: 0, attendance: 0, status: 'Active', subjects: []
                    });
                    successCount++;
                }
            }
        } catch (e) { }
    });

    await Promise.all(promises);

    logActivity(`Admin bulk enrolled/updated ${successCount} students into ${_selectedSection.name}`);
    showMessage(`Successfully enrolled ${successCount} students to ${_selectedSection.name}.`);

    closeAssignScanModal();
    _assignStudentSearch = '';
    renderAssignSection(document.getElementById('content-area'));
}

function removeAllStudentsFromSection() {
    if (!_selectedSection) return;
    const enrolled = students.filter(s => s.section === _selectedSection.name);
    if (enrolled.length === 0) return;
    openConfirmModal('Remove All Students', 'Are you sure you want to remove all ' + enrolled.length + ' students from ' + _selectedSection.name + '?', async () => {
        const resultsDiv = document.getElementById('enrolled-search-results');
        if (resultsDiv) resultsDiv.innerHTML = '<div class="flex flex-col items-center justify-center p-6 gap-3"><div class="spinner border-primary"></div><p class="text-sm font-bold text-primary">Removing Students...</p></div>';
        
        let successCount = 0;
        const promises = enrolled.map(async (s) => {
            try {
                const res = await fetch('/api/students/' + (s.id || s.lrn), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ section: null, school_year: _schoolYearFilter })
                });
                if (res.ok) {
                    s.section = null;
                    successCount++;
                }
            } catch (e) {}
        });
        
        await Promise.all(promises);
        logActivity('Admin removed all students from section: ' + _selectedSection.name);
        showMessage('Successfully removed ' + successCount + ' students.');
        renderAssignSection(document.getElementById('content-area'));
    });
}

function openConfirmModal(title, msg, onConfirm) {
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-msg');
    const modalEl = document.getElementById('custom-confirm-modal');
    if(titleEl) titleEl.innerText = title;
    if(msgEl) msgEl.innerText = msg;
    window._confirmCallback = onConfirm;
    if(modalEl) modalEl.classList.remove('hidden');
}

function closeConfirmModal() {
    const modalEl = document.getElementById('custom-confirm-modal');
    if(modalEl) modalEl.classList.add('hidden');
    window._confirmCallback = null;
}

function toggleSelectAllStudents(source) {
    const checkboxes = document.querySelectorAll('.student-select-cb');
    checkboxes.forEach(cb => cb.checked = source.checked);
    toggleRemoveSelectedBtn();
}

function toggleRemoveSelectedBtn() {
    const checkboxes = document.querySelectorAll('.student-select-cb:checked');
    const btn = document.getElementById('btn-remove-selected');
    const countSpan = document.getElementById('selected-count');
    if (btn && countSpan) {
        if (checkboxes.length > 0) {
            btn.classList.remove('hidden');
            countSpan.innerText = checkboxes.length;
        } else {
            btn.classList.add('hidden');
        }
    }
    
    const selectAllCb = document.getElementById('cb-select-all');
    if (selectAllCb) {
        const allCheckboxes = document.querySelectorAll('.student-select-cb');
        selectAllCb.checked = allCheckboxes.length > 0 && allCheckboxes.length === checkboxes.length;
    }
}

function removeSelectedStudents() {
    if (!_selectedSection) return;
    const checkboxes = document.querySelectorAll('.student-select-cb:checked');
    if (checkboxes.length === 0) return;
    
    const lrns = Array.from(checkboxes).map(cb => cb.value);
    
    openConfirmModal('Remove Selected', 'Are you sure you want to remove ' + lrns.length + ' selected student(s) from ' + _selectedSection.name + '?', async () => {
        const resultsDiv = document.getElementById('enrolled-search-results');
        if (resultsDiv) resultsDiv.innerHTML = '<div class="flex flex-col items-center justify-center p-6 gap-3"><div class="spinner border-primary"></div><p class="text-sm font-bold text-primary">Removing Students...</p></div>';
        
        let successCount = 0;
        const promises = lrns.map(async (lrn) => {
            const s = students.find(st => st.lrn === lrn);
            if (!s) return;
            try {
                const res = await fetch('/api/students/' + (s.id || s.lrn), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ section: null, school_year: _schoolYearFilter })
                });
                if (res.ok) {
                    s.section = null;
                    successCount++;
                }
            } catch (e) {}
        });
        
        await Promise.all(promises);
        logActivity('Admin removed ' + successCount + ' students from section: ' + _selectedSection.name);
        showMessage('Successfully removed ' + successCount + ' students.');
        renderAssignSection(document.getElementById('content-area'));
    });
}
