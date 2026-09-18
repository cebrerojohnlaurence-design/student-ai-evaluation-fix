/**
 * admin/subjects.js — Subject Catalog Management Page
 * Allows Admin to view, add, edit, and delete subjects for
 * Junior High (Grade 7–10) and Senior High (ABM, STEM, GAS, TVL, HUMSS).
 * Supports AI camera scan to extract subjects from an image.
 */

// ─── State ────────────────────────────────────────────────────────────────────
var subPageLevel = 'JH';
var subPageJHGrade = 7;
var subPageStrand = 'Academic';
var subPageGrade = 11;
var subPageSem = 1;

// ─── ENTRY POINT ─────────────────────────────────────────────────────────────
function renderSubjects(container) {
    let tabsHtml = '';
    if (currentUser.role === 'curriculum_coordinator') {
        if (currentUser.department === 'JHS') {
            tabsHtml = '<div class="flex gap-2 bg-gray-100 rounded-2xl p-1.5 w-fit">' +
                '<button id="tab-btn-JH" class="px-6 py-2 rounded-xl text-sm font-bold transition bg-white text-primary shadow-sm cursor-default">Junior High</button>' +
                '</div>';
            subPageLevel = 'JH';
        } else if (currentUser.department === 'SHS') {
            tabsHtml = '<div class="flex gap-2 bg-gray-100 rounded-2xl p-1.5 w-fit">' +
                '<button id="tab-btn-SH" class="px-6 py-2 rounded-xl text-sm font-bold transition bg-white text-primary shadow-sm cursor-default">Senior High</button>' +
                '</div>';
            subPageLevel = 'SH';
        }
    } else {
        tabsHtml = '<div class="flex gap-2 bg-gray-100 rounded-2xl p-1.5 w-fit">' +
            '<button id="tab-btn-JH" onclick="setSubjectLevel(\'JH\')" class="' + (subPageLevel === 'JH' ? 'px-6 py-2 rounded-xl text-sm font-bold transition bg-white text-primary shadow-sm' : 'px-6 py-2 rounded-xl text-sm font-bold transition text-gray-500 hover:text-primary') + '">Junior High</button>' +
            '<button id="tab-btn-SH" onclick="setSubjectLevel(\'SH\')" class="' + (subPageLevel === 'SH' ? 'px-6 py-2 rounded-xl text-sm font-bold transition bg-white text-primary shadow-sm' : 'px-6 py-2 rounded-xl text-sm font-bold transition text-gray-500 hover:text-primary') + '">Senior High</button>' +
            '</div>';
    }

    container.innerHTML =
        '<div class="flex flex-col gap-6 animate-slide-up max-w-5xl mx-auto">' +
        '<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">' +
        '<div>' +
        '<h2 class="text-2xl font-bold text-gray-800 tracking-tight">Subject Catalog</h2>' +
        '<p class="text-sm text-gray-400 mt-1">Manage subjects for Junior High and Senior High strands.</p>' +
        '</div>' +
        '<button onclick="openSubjectAIScan()" class="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primaryDark transition shadow-md">' +
        '<i class="fas fa-camera"></i> AI Scan Subjects' +
        '</button>' +
        '</div>' +
        tabsHtml +
        '<div id="subject-content-area"></div>' +
        '</div>' +
        '<div id="subject-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">' +
        '<div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 animate-scale-up">' +
        '<h3 id="subject-modal-title" class="text-lg font-bold text-gray-800 mb-5">Add Subject</h3>' +
        '<input id="subject-modal-input" type="text" placeholder="Subject name..." ' +
        'class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary bg-gray-50 mb-5" ' +
        'onkeypress="if(event.key===\'Enter\') saveSubjectModal()">' +
        '<div class="flex gap-3">' +
        '<button onclick="saveSubjectModal()" class="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primaryDark transition">Save</button>' +
        '<button onclick="closeSubjectModal()" class="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition">Cancel</button>' +
        '</div>' +
        '</div>' +
        '</div>';

    renderSubjectContent();
}

function setSubjectLevel(level) {
    subPageLevel = level;
    var jhBtn = document.getElementById('tab-btn-JH');
    var shBtn = document.getElementById('tab-btn-SH');
    if (!jhBtn || !shBtn) return;
    if (level === 'JH') {
        jhBtn.className = 'px-6 py-2 rounded-xl text-sm font-bold transition bg-white text-primary shadow-sm';
        shBtn.className = 'px-6 py-2 rounded-xl text-sm font-bold transition text-gray-500 hover:text-primary';
    } else {
        shBtn.className = 'px-6 py-2 rounded-xl text-sm font-bold transition bg-white text-primary shadow-sm';
        jhBtn.className = 'px-6 py-2 rounded-xl text-sm font-bold transition text-gray-500 hover:text-primary';
    }
    renderSubjectContent();
}

function renderSubjectContent() {
    var area = document.getElementById('subject-content-area');
    if (!area) return;
    if (subPageLevel === 'JH') {
        renderJHSubjects(area);
    } else {
        renderSHSubjects(area);
    }
}

// ─── JUNIOR HIGH SUBJECTS ─────────────────────────────────────────────────────
function renderJHSubjects(area) {
    var gradeTabs = '';
    var grades = [7, 8, 9, 10];
    if (typeof globalSettings !== 'undefined' && globalSettings.system_lists) {
        try {
            var parsed = JSON.parse(globalSettings.system_lists);
            if (parsed.grade_levels) {
                grades = parsed.grade_levels.map(g => parseInt(g.replace(/\D/g, ''))).filter(n => !isNaN(n));
            }
        } catch(e){}
    }
    for (var gi = 0; gi < grades.length; gi++) {
        var g = grades[gi];
        gradeTabs +=
            '<button onclick="setSubjectJHGrade(' + g + ')" class="px-4 py-2 rounded-lg text-xs font-bold transition ' +
            (subPageJHGrade === g ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400') +
            '">Grade ' + g + '</button>';
    }

    var subjectKey = 'JH_' + subPageJHGrade;
    var subjects = getSubjectsForReport('JH', null, subPageJHGrade, 1);
    var listHtml = '';
    if (subjects.length === 0) {
        listHtml = '<li class="py-10 text-center text-gray-400 italic text-sm">No subjects. Click "Add Subject" to begin.</li>';
    } else {
        for (var i = 0; i < subjects.length; i++) {
            var s = subjects[i];
            var esc = s.replace(/'/g, "\\'");
            listHtml +=
                '<li class="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition group">' +
                '<div class="flex items-center gap-3">' +
                '<span class="w-6 h-6 rounded-full bg-green-100 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">' + (i + 1) + '</span>' +
                '<span class="text-sm font-medium text-gray-700">' + s + '</span>' +
                '</div>' +
                '<div class="flex gap-1 opacity-0 group-hover:opacity-100 transition">' +
                '<button onclick="openEditSubjectModal(\'' + subjectKey + '\',' + i + ',\'' + esc + '\')" class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition flex items-center justify-center text-[11px]"><i class="fas fa-pen"></i></button>' +
                '<button onclick="deleteSubject(\'' + subjectKey + '\',' + i + ')" class="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition flex items-center justify-center text-[11px]"><i class="fas fa-trash"></i></button>' +
                '</div>' +
                '</li>';
        }
    }

    area.innerHTML =
        '<div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">' +
        '<div class="p-5 border-b bg-gradient-to-r from-green-50 to-emerald-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">' +
        '<div>' +
        '<h3 class="font-bold text-gray-800">Grade ' + subPageJHGrade + ' Subjects</h3>' +
        '<p class="text-xs text-gray-400 mt-0.5">Manage subjects for Grade ' + subPageJHGrade + '.</p>' +
        '</div>' +
        '<div class="flex gap-2 flex-wrap">' + gradeTabs + '</div>' +
        '</div>' +
        '<div class="px-5 py-3 border-b flex justify-end bg-gray-50/50">' +
        '<button onclick="openAddSubjectModal(\'' + subjectKey + '\')" class="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primaryDark transition shadow-sm flex items-center gap-2"><i class="fas fa-plus"></i> Add Subject</button>' +
        '</div>' +
        '<ul id="jh-subject-list" class="divide-y divide-gray-50">' + listHtml + '</ul>' +
        '</div>';
}

function setSubjectJHGrade(g) { subPageJHGrade = g; renderSubjectContent(); }

// ─── SENIOR HIGH SUBJECTS ─────────────────────────────────────────────────────
var strandColors = {
    Academic: { bg: 'bg-blue-600', light: 'bg-blue-50', text: 'text-blue-700' },
    TechPro: { bg: 'bg-green-600', light: 'bg-green-50', text: 'text-green-700' }
};

function renderSHSubjects(area) {
    var strandTabs = '';
    if (currentUser.role === 'curriculum_coordinator' && currentUser.department === 'SHS' && currentUser.strand) {
        // Only show the coordinator's specific strand
        var st = currentUser.strand;
        subPageStrand = st; // Force it
        var c = strandColors[st] || { bg: 'bg-gray-600', light: 'bg-gray-50', text: 'text-gray-700' };
        strandTabs += '<button class="px-4 py-2 rounded-xl text-xs font-bold transition ' + c.bg + ' text-white shadow-sm cursor-default">' + st + '</button>';
    } else {
        for (var si = 0; si < SH_STRANDS.length; si++) {
            var st = SH_STRANDS[si];
            var c = strandColors[st] || { bg: 'bg-gray-600', light: 'bg-gray-50', text: 'text-gray-700' };
            var active = st === subPageStrand;
            strandTabs +=
                '<button onclick="setSubjectStrand(\'' + st + '\')" class="px-4 py-2 rounded-xl text-xs font-bold transition ' +
                (active ? c.bg + ' text-white shadow-sm' : 'bg-white border border-gray-200 ' + c.text + ' hover:bg-gray-50') +
                '">' + st + '</button>';
        }
    }

    var gradeTabs = '';
    var grades = [11, 12];
    if (typeof globalSettings !== 'undefined' && globalSettings.system_lists) {
        try {
            var parsed = JSON.parse(globalSettings.system_lists);
            if (parsed.grade_levels) {
                grades = parsed.grade_levels.map(g => parseInt(g.replace(/\D/g, ''))).filter(n => !isNaN(n));
            }
        } catch(e){}
    }
    for (var gi = 0; gi < grades.length; gi++) {
        var g = grades[gi];
        gradeTabs +=
            '<button onclick="setSubjectGrade(' + g + ')" class="px-4 py-2 rounded-lg text-xs font-bold transition ' +
            (subPageGrade === g ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400') +
            '">Grade ' + g + '</button>';
    }

    var semTabs = '';
    for (var sem = 1; sem <= 2; sem++) {
        semTabs +=
            '<button onclick="setSubjectSem(' + sem + ')" class="px-4 py-2 rounded-lg text-xs font-bold transition ' +
            (subPageSem === sem ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary') +
            '">' + (sem === 1 ? '1st Semester (Q1+Q2)' : '2nd Semester (Q3+Q4)') + '</button>';
    }

    var subjectKey = 'SH_' + subPageStrand + '_' + subPageGrade + '_sem' + subPageSem;
    var semKey = subPageSem === 1 ? 'sem1' : 'sem2';
    var subjects = [];
    try {
        var custom = JSON.parse(localStorage.getItem('cnhs_subject_catalog_custom') || '{}');
        if (custom[subjectKey]) {
            subjects = custom[subjectKey];
        } else {
            var sd = SUBJECT_CATALOG.SH[subPageStrand];
            if (sd && sd[subPageGrade] && sd[subPageGrade][semKey]) {
                subjects = sd[subPageGrade][semKey].slice();
            }
        }
    } catch (e) { subjects = []; }

    var isTechPro = subPageStrand === 'TechPro';
    var c2 = strandColors[subPageStrand] || { bg: 'bg-gray-600', light: 'bg-gray-50', text: 'text-gray-700' };

    var bodyHtml = '';
    if (false) { // Condition removed because the variable isTVLorHUMSS is undefined
        bodyHtml =
            '<div class="py-16 text-center text-gray-400">' +
            '<i class="fas fa-clock text-4xl mb-3 opacity-20"></i>' +
            '<p class="font-semibold text-sm">' + subPageStrand + ' subjects — Coming Soon</p>' +
            '<p class="text-xs mt-1">You can add subjects manually using the button below.</p>' +
            '<button onclick="openAddSubjectModal(\'' + subjectKey + '\')" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primaryDark transition shadow-sm"><i class="fas fa-plus mr-1"></i> Add Manually</button>' +
            '</div>';
    } else {
        var listHtml2 = '';
        if (subjects.length === 0) {
            listHtml2 = '<li class="py-10 text-center text-gray-400 italic text-sm">No subjects for this semester yet.</li>';
        } else {
            for (var j = 0; j < subjects.length; j++) {
                var subj = subjects[j];
                var esc2 = subj.replace(/'/g, "\\'");
                listHtml2 +=
                    '<li class="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition group">' +
                    '<div class="flex items-center gap-3">' +
                    '<span class="w-6 h-6 rounded-full ' + c2.light + ' ' + c2.text + ' text-[10px] font-bold flex items-center justify-center shrink-0">' + (j + 1) + '</span>' +
                    '<span class="text-sm font-medium text-gray-700">' + subj + '</span>' +
                    '</div>' +
                    '<div class="flex gap-1 opacity-0 group-hover:opacity-100 transition">' +
                    '<button onclick="openEditSubjectModal(\'' + subjectKey + '\',' + j + ',\'' + esc2 + '\')" class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition flex items-center justify-center text-[11px]"><i class="fas fa-pen"></i></button>' +
                    '<button onclick="deleteSubject(\'' + subjectKey + '\',' + j + ')" class="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition flex items-center justify-center text-[11px]"><i class="fas fa-trash"></i></button>' +
                    '</div>' +
                    '</li>';
            }
        }
        bodyHtml =
            '<div class="px-5 py-3 border-b flex justify-end">' +
            '<button onclick="openAddSubjectModal(\'' + subjectKey + '\')" class="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primaryDark transition shadow-sm flex items-center gap-2"><i class="fas fa-plus"></i> Add Subject</button>' +
            '</div>' +
            '<ul class="divide-y divide-gray-50">' + listHtml2 + '</ul>';
    }

    area.innerHTML =
        '<div class="flex flex-wrap gap-2 mb-4">' + strandTabs + '</div>' +
        '<div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">' +
        '<div class="p-5 border-b ' + c2.light + ' flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">' +
        '<div>' +
        '<div class="flex items-center gap-2 mb-1">' +
        '<span class="px-2.5 py-0.5 ' + c2.bg + ' text-white text-[10px] font-bold rounded-full">' + subPageStrand + '</span>' +
        '<span class="text-xs text-gray-400">Grade ' + subPageGrade + ' · ' + (subPageSem === 1 ? '1st Semester' : '2nd Semester') + '</span>' +
        '</div>' +
        '<h3 class="font-bold text-gray-800">' + subPageStrand + ' — Grade ' + subPageGrade + ' Subject List</h3>' +
        '</div>' +
        '<div class="flex gap-2 flex-wrap">' + gradeTabs + '</div>' +
        '</div>' +
        '<div class="px-5 py-3 border-b bg-gray-50/50 flex gap-2">' + semTabs + '</div>' +
        bodyHtml +
        '</div>';
}

// ─── Strand / Grade / Sem helpers ─────────────────────────────────────────────
function setSubjectStrand(s) { subPageStrand = s; renderSubjectContent(); }
function setSubjectGrade(g) { subPageGrade = g; renderSubjectContent(); }
function setSubjectSem(s) { subPageSem = s; renderSubjectContent(); }

// ─── CRUD Helpers ─────────────────────────────────────────────────────────────
var _subModalKey = null;
var _subModalIdx = null;

function getCustomSubjectList(key) {
    try {
        var custom = JSON.parse(localStorage.getItem('cnhs_subject_catalog_custom') || '{}');
        if (custom[key]) return custom[key];
    } catch (e) { /* ignore */ }
    if (key.startsWith('JH_')) {
        var gMatch = key.match(/^JH_(\d+)$/);
        if (gMatch) {
            var g = parseInt(gMatch[1]);
            var jhGradeSd = SUBJECT_CATALOG.JH[g];
            return jhGradeSd ? jhGradeSd.subjects.slice() : SUBJECT_CATALOG.JH.subjects.slice();
        }
        return SUBJECT_CATALOG.JH.subjects.slice();
    }
    var parts = key.match(/^SH_(\w+)_(\d+)_sem(\d)$/);
    if (parts) {
        var strand = parts[1], grade = parseInt(parts[2]), sem = 'sem' + parts[3];
        var sd = SUBJECT_CATALOG.SH[strand];
        if (sd && sd[grade] && sd[grade][sem]) return sd[grade][sem].slice();
    }
    return [];
}

function setCustomSubjectList(key, list) {
    var custom = {};
    try { custom = JSON.parse(localStorage.getItem('cnhs_subject_catalog_custom') || '{}'); } catch (e) { }
    custom[key] = list;
    localStorage.setItem('cnhs_subject_catalog_custom', JSON.stringify(custom));
}

function openAddSubjectModal(key) {
    _subModalKey = key;
    _subModalIdx = null;
    document.getElementById('subject-modal-title').innerText = 'Add Subject';
    document.getElementById('subject-modal-input').value = '';
    document.getElementById('subject-modal').classList.remove('hidden');
    setTimeout(function () { document.getElementById('subject-modal-input').focus(); }, 50);
}

function openEditSubjectModal(key, idx, current) {
    _subModalKey = key;
    _subModalIdx = idx;
    document.getElementById('subject-modal-title').innerText = 'Edit Subject';
    document.getElementById('subject-modal-input').value = current;
    document.getElementById('subject-modal').classList.remove('hidden');
    setTimeout(function () { document.getElementById('subject-modal-input').focus(); }, 50);
}

function closeSubjectModal() {
    document.getElementById('subject-modal').classList.add('hidden');
    _subModalKey = null;
    _subModalIdx = null;
}

function saveSubjectModal() {
    var val = document.getElementById('subject-modal-input').value.trim();
    if (!val) { showMessage('Subject name cannot be empty.', true); return; }
    if (!_subModalKey) return;
    var list = getCustomSubjectList(_subModalKey);
    if (_subModalIdx === null) {
        list.push(val);
        showMessage('Subject "' + val + '" added.');
    } else {
        list[_subModalIdx] = val;
        showMessage('Subject updated to "' + val + '".');
    }
    setCustomSubjectList(_subModalKey, list);
    closeSubjectModal();
    renderSubjectContent();
}

function deleteSubject(key, idx) {
    var list = getCustomSubjectList(key);
    var name = list[idx];
    if (!confirm('Delete subject "' + name + '"?')) return;
    
    list.splice(idx, 1);
    setCustomSubjectList(key, list);
    renderSubjectContent();
    
    showUndoToast(`Deleted subject "${name}"`, 
    async () => {
        var listNow = getCustomSubjectList(key);
        listNow.splice(idx, 0, name);
        setCustomSubjectList(key, listNow);
        renderSubjectContent();
        showMessage('Subject restored.');
    }, 
    async () => {
        // No server finalize needed, already saved to local storage
    });
}

// ─── AI SUBJECT SCAN ───────────────────────────────────────────────────────────
function openSubjectAIScan() {
    var cameraModal = document.getElementById('camera-modal');
    if (!cameraModal) { showMessage('Camera scanner not available.', true); return; }
    if (typeof currentMode !== 'undefined') currentMode = 'SUBJECT_SCAN';
    cameraModal.classList.remove('hidden');
    var title = document.getElementById('camera-title');
    var hint = document.getElementById('camera-hint');
    if (title) title.innerText = 'AI Subject Scanner';
    if (hint) hint.innerText = 'Upload an image of a subject list to auto-extract';
    var upload = document.getElementById('doc-upload');
    var preview = document.getElementById('doc-preview');
    var placeholder = document.getElementById('doc-placeholder');
    var processBtn = document.getElementById('process-btn');
    var status = document.getElementById('processing-status');
    if (upload) upload.value = '';
    if (preview) preview.classList.add('hidden');
    if (placeholder) placeholder.classList.remove('hidden');
    if (processBtn) processBtn.disabled = true;
    if (status) status.classList.add('hidden');
}

function showSubjectScanPicker(subjects) {
    var existing = document.getElementById('subject-scan-picker');
    if (existing) existing.remove();

    var strandOpts = '';
    for (var i = 0; i < SH_STRANDS.length; i++) {
        strandOpts += '<option>' + SH_STRANDS[i] + '</option>';
    }

    var subjectListHtml = '';
    for (var j = 0; j < subjects.length; j++) {
        subjectListHtml += '<p class="text-xs text-gray-700 py-0.5">' + (j + 1) + '. ' + subjects[j] + '</p>';
    }

    var overlay = document.createElement('div');
    overlay.id = 'subject-scan-picker';
    overlay.className = 'fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in';
    overlay.innerHTML =
        '<div class="bg-white rounded-2xl shadow-2xl p-7 max-w-md w-full mx-4 animate-scale-up">' +
        '<h3 class="text-lg font-bold text-gray-800 mb-1">AI Found ' + subjects.length + ' Subject' + (subjects.length !== 1 ? 's' : '') + '</h3>' +
        '<p class="text-xs text-gray-400 mb-5">Choose where to add these subjects:</p>' +
        '<div class="space-y-3 mb-5">' +
        '<div>' +
        '<label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Level</label>' +
        '<select id="scan-level" onchange="document.getElementById(\'scan-strand-wrap\').classList.toggle(\'hidden\',this.value===\'JH\'); document.getElementById(\'scan-jh-wrap\').classList.toggle(\'hidden\',this.value===\'SH\');" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-primary bg-white">' +
        '<option value="JH">Junior High (Grade 7–10)</option>' +
        '<option value="SH">Senior High</option>' +
        '</select>' +
        '</div>' +
        '<div id="scan-jh-wrap" class="space-y-2">' +
        '<div><label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Grade</label>' +
        '<select id="scan-jh-grade" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-primary bg-white"><option value="7">Grade 7</option><option value="8">Grade 8</option><option value="9">Grade 9</option><option value="10">Grade 10</option></select></div>' +
        '</div>' +
        '<div id="scan-strand-wrap" class="hidden space-y-2">' +
        '<div><label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Strand</label>' +
        '<select id="scan-strand" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-primary bg-white">' + strandOpts + '</select></div>' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Grade</label>' +
        '<select id="scan-grade" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-primary bg-white"><option value="11">Grade 11</option><option value="12">Grade 12</option></select></div>' +
        '<div><label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Semester</label>' +
        '<select id="scan-sem" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-primary bg-white"><option value="1">1st Semester</option><option value="2">2nd Semester</option></select></div>' +
        '</div>' +
        '</div>' +
        '<div class="p-3 bg-gray-50 rounded-xl border border-gray-200 max-h-40 overflow-y-auto">' +
        '<p class="text-[10px] font-bold text-gray-400 uppercase mb-2">Detected Subjects</p>' +
        subjectListHtml +
        '</div>' +
        '</div>' +
        '<div class="flex gap-3">' +
        '<button id="apply-scan-btn" class="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primaryDark transition">Add These Subjects</button>' +
        '<button onclick="document.getElementById(\'subject-scan-picker\').remove()" class="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition">Cancel</button>' +
        '</div>' +
        '</div>';
    document.body.appendChild(overlay);

    // Store subjects in a closure-safe way
    document.getElementById('apply-scan-btn').onclick = function () {
        applyScannedSubjectsList(subjects);
    };
}

function applyScannedSubjectsList(subjects) {
    var level = document.getElementById('scan-level') ? document.getElementById('scan-level').value : 'JH';
    var key;
    if (level === 'JH') {
        var jhGrade = document.getElementById('scan-jh-grade') ? document.getElementById('scan-jh-grade').value : '7';
        key = 'JH_' + jhGrade;
    } else {
        var strand = document.getElementById('scan-strand') ? document.getElementById('scan-strand').value : 'Academic';
        var grade = document.getElementById('scan-grade') ? document.getElementById('scan-grade').value : '11';
        var sem = document.getElementById('scan-sem') ? document.getElementById('scan-sem').value : '1';
        key = 'SH_' + strand + '_' + grade + '_sem' + sem;
    }
    var existing = getCustomSubjectList(key);
    var toAdd = subjects.filter(function (s) { return !existing.includes(s); });
    var merged = existing.concat(toAdd);
    setCustomSubjectList(key, merged);
    var picker = document.getElementById('subject-scan-picker');
    if (picker) picker.remove();
    showMessage('Added ' + toAdd.length + ' new subject' + (toAdd.length !== 1 ? 's' : '') + '.');
    subPageLevel = level;
    if (level === 'SH') {
        subPageStrand = document.getElementById('scan-strand') ? document.getElementById('scan-strand').value : 'Academic';
        subPageGrade = parseInt(document.getElementById('scan-grade') ? document.getElementById('scan-grade').value : '11');
        subPageSem = parseInt(document.getElementById('scan-sem') ? document.getElementById('scan-sem').value : '1');
    } else {
        subPageJHGrade = parseInt(document.getElementById('scan-jh-grade') ? document.getElementById('scan-jh-grade').value : '7');
    }
    navigate('subjects');
}
