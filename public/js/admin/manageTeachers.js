/**
 * admin/manageTeachers.js — Manage Teachers page render functions
 * Supports JH / SH level and strand assignment per teacher.
 */

// ─── State ────────────────────────────────────────────────────────────────────
let teacherLevelFilter = 'ALL'; // 'ALL' | 'JH' | 'SH'

async function renderManageTeachers(container) {
    if (typeof fetchSettings === 'function') {
        await fetchSettings();
    }
    const levelColors = { JH: 'bg-green-100 text-green-700', SH: 'bg-blue-100 text-blue-700' };
    const strandBadgeColors = {
        Academic: 'bg-blue-50 text-blue-600', TechPro: 'bg-green-50 text-green-600'
    };

    // Filter teachers by level
    let filtered = teachers;
    if (currentUser.role === 'curriculum_coordinator') {
        if (currentUser.department === 'JHS') {
            filtered = teachers.filter(t => (t.level || 'JH') === 'JH');
            teacherLevelFilter = 'JH';
        } else if (currentUser.department === 'SHS') {
            filtered = teachers.filter(t => (t.level || 'JH') === 'SH');
            teacherLevelFilter = 'SH';
        }
    } else {
        filtered = teacherLevelFilter === 'ALL' ? teachers : teachers.filter(t => (t.level || 'JH') === teacherLevelFilter);
    }

    let levelBtns = '';
    if (currentUser.role !== 'curriculum_coordinator') {
        levelBtns = ['ALL', 'JH', 'SH'].map(l => {
            const active = l === teacherLevelFilter;
            const labels = { ALL: 'All', JH: 'Junior High', SH: 'Senior High' };
            return `<button onclick="setTeacherLevelFilter('${l}')"
                class="px-4 py-1.5 rounded-full text-xs font-bold border transition
                ${active ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'}">
                ${labels[l]}
            </button>`;
        }).join('');
    }

    let strandOptionsHtml = SH_STRANDS.map(s => `<option value="${s}">${s}</option>`).join('');
    if (currentUser.role === 'curriculum_coordinator' && currentUser.department === 'SHS' && currentUser.strand) {
        strandOptionsHtml = `<option value="${currentUser.strand}" selected>${currentUser.strand} Track</option>`;
    }

    container.innerHTML = `
        <div class="animate-fade-in max-w-5xl mx-auto">
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-800 tracking-tight">Manage Teachers</h2>
                <p class="text-sm text-gray-500 mt-1">Add or update teacher accounts, assign subjects, and set JH/SH level.</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Add / Edit Teacher Form -->
                <div class="lg:col-span-1">
                    <div class="bg-white p-7 rounded-3xl shadow-sm border border-gray-100">
                        <h3 class="font-bold text-gray-800 mb-5 flex items-center gap-2">
                            <i class="fas fa-user-plus text-primary"></i> Register Teacher
                        </h3>
                        <form onsubmit="saveTeacher(event)" class="space-y-4">
                            <div>
                                <label class="text-xs font-bold text-gray-500 uppercase block mb-1.5">Full Name</label>
                                <input type="text" id="t-name" required
                                    class="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:bg-white focus:border-primary outline-none transition"
                                    placeholder="e.g. Ms. Maria Santos">
                            </div>
                            <div>
                                <label class="text-xs font-bold text-gray-500 uppercase block mb-1.5">Username</label>
                                <input type="text" id="t-user" required
                                    class="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:bg-white focus:border-primary outline-none transition"
                                    placeholder="e.g. maria.santos">
                            </div>
                            <div>
                                <label class="text-xs font-bold text-gray-500 uppercase block mb-1.5">Password</label>
                                <input type="password" id="t-pass"
                                    class="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:bg-white focus:border-primary outline-none transition"
                                    placeholder="Min. 6 chars (leave blank to keep)">
                            </div>

                            <!-- School Level -->
                            <div>
                                <label class="text-xs font-bold text-gray-500 uppercase block mb-1.5">School Level</label>
                                <div class="grid grid-cols-2 gap-2">
                                    <button type="button" id="level-btn-JH" onclick="setTeacherFormLevel('JH')"
                                        class="py-2.5 rounded-xl border-2 text-xs font-bold transition border-primary bg-primary text-white ${currentUser.role === 'curriculum_coordinator' && currentUser.department === 'SHS' ? 'hidden' : ''}">
                                        <i class="fas fa-school mr-1"></i> Junior High
                                    </button>
                                    <button type="button" id="level-btn-SH" onclick="setTeacherFormLevel('SH')"
                                        class="py-2.5 rounded-xl border-2 text-xs font-bold transition border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary ${currentUser.role === 'curriculum_coordinator' && currentUser.department === 'JHS' ? 'hidden' : ''}">
                                        <i class="fas fa-graduation-cap mr-1"></i> Senior High
                                    </button>
                                </div>
                                <input type="hidden" id="t-level" value="JH">
                            </div>

                            <!-- Strand (SH only) -->
                            <div id="t-strand-wrap" class="hidden">
                                <label class="text-xs font-bold text-gray-500 uppercase block mb-1.5">Strand</label>
                                <select id="t-strand" onchange="refreshTeacherSubjectCheckboxes()"
                                    class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-primary bg-white">
                                    ${strandOptionsHtml}
                                </select>
                            </div>

                            <!-- Subjects -->
                            <div>
                                <label class="text-xs font-bold text-gray-500 uppercase block mb-1.5">Assigned Subjects</label>
                                <div class="grid grid-cols-2 gap-2 mb-2" id="t-subject-checkboxes">
                                    <!-- Populated dynamically by refreshTeacherSubjectCheckboxes() -->
                                </div>
                                <div id="custom-subject-area" class="hidden">
                                    <input type="text" id="t-subject-custom"
                                        class="w-full px-4 py-3 border border-dashed border-primary rounded-xl bg-green-50 text-sm focus:bg-white outline-none transition"
                                        placeholder="Custom subjects (comma separated)">
                                </div>
                            </div>

                            <input type="hidden" id="t-id">
                            <input type="hidden" id="t-db-id">
                            <button type="submit" id="save-teacher-btn"
                                class="w-full py-3.5 bg-gray-900 text-white rounded-xl font-bold tracking-wide transition shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2">
                                <i class="fas fa-save"></i> Save Teacher
                            </button>
                        </form>
                    </div>
                </div>

                <!-- Teachers Table -->
                <div class="lg:col-span-2">
                    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-slide-up">
                        <div class="p-5 border-b bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <p class="font-bold text-gray-700">${teachers.length} Registered Teacher(s)</p>
                            <div class="flex gap-2 flex-wrap">${levelBtns}</div>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs">
                                <thead class="bg-white text-gray-400 uppercase font-bold border-b">
                                    <tr>
                                        <th class="px-5 py-4">Name</th>
                                        <th class="px-5 py-4">Level / Strand</th>
                                        <th class="px-5 py-4">Subject</th>
                                        <th class="px-5 py-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-50">
                                    ${filtered.length === 0
            ? `<tr><td colspan="4" class="py-10 text-center text-gray-400 italic">No teachers found.</td></tr>`
            : filtered.map(t => {
                const lvl = t.level || 'JH';
                const lvlClass = levelColors[lvl] || 'bg-gray-100 text-gray-600';
                const strand = t.strand ? `<span class="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${strandBadgeColors[t.strand] || 'bg-gray-100 text-gray-600'}">${t.strand}</span>` : '';
                return `
                                        <tr class="hover:bg-gray-50 transition">
                                            <td class="px-5 py-3.5">
                                                <p class="font-bold text-gray-800">${t.name}</p>
                                                <p class="font-mono text-gray-400 text-[10px]">${t.user}</p>
                                            </td>
                                            <td class="px-5 py-3.5">
                                                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${lvlClass}">${lvl}</span>
                                                ${strand}
                                            </td>
                                            <td class="px-5 py-3.5">
                                                <span class="px-2 py-0.5 rounded text-[10px] bg-green-50 text-green-700 font-bold border border-green-100 block w-max mb-1">
                                                    ${t.subject || '-'}
                                                </span>
                                                ${t.is_adviser ? `<span class="px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 font-bold border border-amber-100 flex items-center gap-1 w-max" title="Adviser"><i class="fas fa-star text-[8px]"></i>${t.section || 'Unassigned'}</span>` : ''}
                                            </td>
                                            <td class="px-5 py-3.5">
                                                <button onclick="editTeacher('${t.id}')" class="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition mr-1">
                                                    <i class="fas fa-edit mr-1"></i>Edit
                                                </button>
                                                <button onclick="deleteTeacher(${t.db_id}, '${t.id}')" class="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-[10px] font-bold hover:bg-red-100 transition">
                                                    <i class="fas fa-trash mr-1"></i>Del
                                                </button>
                                            </td>
                                        </tr>`;
            }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    // Populate subject checkboxes for the default JH level immediately after DOM is injected
    setTimeout(() => {
        if (currentUser.role === 'curriculum_coordinator') {
            if (currentUser.department === 'SHS') setTeacherFormLevel('SH');
            else setTeacherFormLevel('JH');
        } else {
            refreshTeacherSubjectCheckboxes();
        }
    }, 0);
}

// ─── Form Helpers ─────────────────────────────────────────────────────────────
function setTeacherLevelFilter(l) {
    teacherLevelFilter = l;
    renderManageTeachers(document.getElementById('content-area'));
}

function setTeacherFormLevel(level) {
    document.getElementById('t-level').value = level;
    ['JH', 'SH'].forEach(l => {
        const btn = document.getElementById(`level-btn-${l}`);
        if (!btn) return;
        if (l === level) {
            btn.className = btn.className.replace('border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary', '');
            btn.classList.add('border-primary', 'bg-primary', 'text-white');
        } else {
            btn.classList.remove('border-primary', 'bg-primary', 'text-white');
            btn.classList.add('border-gray-200', 'bg-white', 'text-gray-600', 'hover:border-primary', 'hover:text-primary');
        }
    });
    const strandWrap = document.getElementById('t-strand-wrap');
    if (strandWrap) strandWrap.classList.toggle('hidden', level === 'JH');
    refreshTeacherSubjectCheckboxes();
}

function refreshTeacherSubjectCheckboxes(preChecked) {
    const box = document.getElementById('t-subject-checkboxes');
    if (!box) return;

    const level = document.getElementById('t-level')?.value || 'JH';
    const strand = document.getElementById('t-strand')?.value || 'Academic';

    // Build the subject list from SUBJECT_CATALOG
    let subjects = [];
    const seen = new Set();
    
    // Merge dynamically added subjects from settings if available
    let dynamicJH = [];
    let dynamicSH = [];
    if (typeof globalSettings !== 'undefined' && globalSettings.system_lists) {
        try {
            const parsed = JSON.parse(globalSettings.system_lists);
            if (parsed.jh_subjects) dynamicJH = parsed.jh_subjects;
            if (parsed.sh_subjects) dynamicSH = parsed.sh_subjects;
        } catch (e) {}
    }

    if (level === 'JH') {
        [7, 8, 9, 10].forEach(g => {
            if (SUBJECT_CATALOG.JH[g] && SUBJECT_CATALOG.JH[g].subjects) {
                SUBJECT_CATALOG.JH[g].subjects.forEach(sub => { if (!seen.has(sub)) { seen.add(sub); subjects.push(sub); } });
            }
        });
        if (SUBJECT_CATALOG.JH.subjects) {
            SUBJECT_CATALOG.JH.subjects.forEach(sub => { if (!seen.has(sub)) { seen.add(sub); subjects.push(sub); } });
        }
        dynamicJH.forEach(sub => { if (!seen.has(sub)) { seen.add(sub); subjects.push(sub); } });
    } else {
        // Combine all grades+sems for the strand (unique)
        const sd = SUBJECT_CATALOG.SH[strand];
        if (sd) {
            [11, 12].forEach(g => {
                ['sem1', 'sem2'].forEach(s => {
                    if (sd[g] && sd[g][s]) {
                        sd[g][s].forEach(sub => { if (!seen.has(sub)) { seen.add(sub); subjects.push(sub); } });
                    }
                });
            });
        }
        dynamicSH.forEach(sub => { if (!seen.has(sub)) { seen.add(sub); subjects.push(sub); } });
    }

    const checked = preChecked || [];

    let html = '';
    subjects.forEach(s => {
        const esc = s.replace(/"/g, '&quot;');
        const isChecked = checked.includes(s) ? 'checked' : '';
        html += '<label class="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold cursor-pointer hover:border-primary transition">' +
            '<input type="checkbox" value="' + esc + '" class="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary" ' + isChecked + '>' +
            s + '</label>';
    });
    // + Custom entry always at end
    html += '<label class="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold cursor-pointer hover:border-primary transition" onchange="toggleManualSubject()">' +
        '<input type="checkbox" value="__custom__" id="t-check-custom" class="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary">' +
        '+ Custom</label>';
    box.innerHTML = html;
}

function toggleManualSubject() {
    const isChecked = document.getElementById('t-check-custom').checked;
    document.getElementById('custom-subject-area').classList.toggle('hidden', !isChecked);
}

// ─── Save Teacher ─────────────────────────────────────────────────────────────
async function saveTeacher(e) {
    e.preventDefault();

    let selectedSubjects = [];
    document.querySelectorAll('#t-subject-checkboxes input[type="checkbox"]:checked').forEach(cb => {
        if (cb.value !== '__custom__') selectedSubjects.push(cb.value);
    });
    if (document.getElementById('t-check-custom').checked) {
        const customVals = document.getElementById('t-subject-custom').value.split(',').map(s => s.trim()).filter(s => s);
        selectedSubjects.push(...customVals);
    }
    const subject = selectedSubjects.join(', ');
    // subject can be empty if teacher has no checkboxes ticked (allowed)

    const dbId = document.getElementById('t-db-id').value;
    const name = document.getElementById('t-name').value.trim();
    const user = document.getElementById('t-user').value.trim();
    const pass = document.getElementById('t-pass').value;
    let level = document.getElementById('t-level').value || 'JH';
    if (currentUser.role === 'curriculum_coordinator') {
        if (currentUser.department === 'SHS') level = 'SH';
        else if (currentUser.department === 'JHS') level = 'JH';
    }
    const strand = level === 'SH' ? (document.getElementById('t-strand')?.value || null) : null;

    const btn = document.getElementById('save-teacher-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; }

    try {
        let res, data;
        if (dbId) {
            const payload = { name, username: user, subject, level, strand };
            if (pass) payload.password = pass;
            res = await fetch(`/api/teachers/${dbId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) });
            data = await res.json();
            if (!res.ok) { showMessage(data.error || 'Failed to update.', true); return; }
            const idx = teachers.findIndex(x => x.db_id == dbId);
            if (idx !== -1) teachers[idx] = { ...data };
            logActivity(`Admin updated teacher: ${name}`);
            showMessage('Teacher updated.');
        } else {
            if (!pass || pass.length < 6) { showMessage('Password must be at least 6 characters.', true); return; }
            res = await fetch('/api/teachers', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ name, username: user, password: pass, subject, level, strand }) });
            data = await res.json();
            if (!res.ok) { showMessage(data.error || 'Failed to create.', true); return; }
            teachers.push({ ...data });
            logActivity(`Admin registered teacher: ${name}`);
            showMessage('Teacher created.');
        }
        navigate('manage-teachers');
    } catch {
        showMessage('Network error. Please try again.', true);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Teacher'; }
    }
}

// ─── Edit / Delete ────────────────────────────────────────────────────────────
function editTeacher(id) {
    const t = teachers.find(x => x.id === id);
    if (!t) return;
    document.getElementById('t-db-id').value = t.db_id || '';
    document.getElementById('t-id').value = t.id;
    document.getElementById('t-name').value = t.name;
    document.getElementById('t-user').value = t.user;
    document.getElementById('t-pass').value = '';

    // Set level
    const level = t.level || 'JH';
    setTeacherFormLevel(level);
    if (level === 'SH' && t.strand) {
        const sel = document.getElementById('t-strand');
        if (sel) sel.value = t.strand;
    }

    // Refresh subject checkboxes for this level/strand
    const teacherSubjects = t.subject ? t.subject.split(',').map(s => s.trim()) : [];
    refreshTeacherSubjectCheckboxes(teacherSubjects);

    // Handle extra subjects (those not in the catalog) as custom
    const remaining = teacherSubjects.filter(s => {
        const box = document.getElementById('t-subject-checkboxes');
        return box && !Array.from(box.querySelectorAll('input:not([value="__custom__"])')).some(cb => cb.value === s);
    });
    if (remaining.length > 0) {
        const customCb = document.getElementById('t-check-custom');
        const customArea = document.getElementById('custom-subject-area');
        const customInput = document.getElementById('t-subject-custom');
        if (customCb) customCb.checked = true;
        if (customArea) customArea.classList.remove('hidden');
        if (customInput) customInput.value = remaining.join(', ');
    }

    // Scroll form into view
    document.getElementById('t-name')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function deleteTeacher(dbId, tid) {
    const t = teachers.find(x => x.id === tid);
    if (!t || !confirm(`Delete teacher ${t.name}?`)) return;
    
    // Optimistically remove from UI
    teachers = teachers.filter(x => x.id !== tid);
    navigate('manage-teachers');
    
    showUndoToast(`Deleted teacher ${t.name}`, 
    async () => {
        // Undo Action
        teachers.push(t);
        navigate('manage-teachers');
        showMessage('Teacher restored.');
    }, 
    async () => {
        // Finalize Action
        try {
            const res = await fetch(`/api/teachers/${dbId}`, { method: 'DELETE', headers: { 'Accept': 'application/json' } });
            if (res.ok) {
                logActivity(`Admin deleted teacher: ${t.name}`);
                showMessage('Teacher removed.');
            } else {
                showMessage('Failed to delete.', true);
                teachers.push(t);
                navigate('manage-teachers');
            }
        } catch {
            showMessage('Network error.', true);
            teachers.push(t);
            navigate('manage-teachers');
        }
    });
}
