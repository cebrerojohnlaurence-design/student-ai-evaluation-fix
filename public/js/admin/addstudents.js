/**
 * admin/addstudents.js — Add Students page render functions
 * Now persists data to MySQL via Laravel API.
 */

function renderAddStudent(container) {
    const sections = [...new Set(students.map(s => s.section))].filter(Boolean).sort();
    const sectionOptions = sections.map(sec => `<option value="${sec}" ${addStudentSection === sec ? 'selected' : ''}>${sec}</option>`).join('');

    container.innerHTML = `
        <div class="animate-fade-in max-w-6xl mx-auto">
            <div class="mb-6 flex justify-between items-end">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800 tracking-tight">Student Registration</h2>
                    <p class="text-sm text-gray-500 mt-1">Register new students or manage the masterlist.</p>
                </div>
            </div>

            <!-- Compact Form -->
            <div class="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 mb-8 relative">
                <div class="absolute top-6 right-6 md:top-8 md:right-8">
                    <button type="button" onclick="openScanner('STUDENT_LIST')" class="flex items-center gap-2 px-4 py-2 bg-green-50 text-primary rounded-xl text-xs font-bold hover:bg-green-100 transition border border-green-200 shadow-sm" title="Upload an image of a class list to auto-fill students">
                        <i class="fas fa-camera text-lg"></i> <span class="hidden sm:inline">AI Batch Scan</span>
                    </button>
                </div>
                <form onsubmit="manualAdd(event)" class="space-y-5 pt-2">
                    <div class="w-full sm:w-2/3 md:w-1/2">
                        <label class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">LRN (8 Digits)</label>
                        <div class="relative">
                            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><i class="fas fa-id-card text-gray-400"></i></div>
                            <input type="text" id="m-lrn" required maxlength="8" pattern="[0-9]{8}"
                                class="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition shadow-sm"
                                placeholder="e.g. 12345678" oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
                        <div class="md:col-span-5"><label class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Last Name</label><input type="text" id="m-last" required class="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:bg-white focus:border-primary outline-none transition shadow-sm" placeholder="e.g. Dela Cruz"></div>
                        <div class="md:col-span-5"><label class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">First Name</label><input type="text" id="m-first" required class="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:bg-white focus:border-primary outline-none transition shadow-sm" placeholder="e.g. Juan"></div>
                        <div class="md:col-span-2"><label class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">M.I.</label><input type="text" id="m-mi" maxlength="2" class="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:bg-white focus:border-primary outline-none transition shadow-sm text-center" placeholder="P."></div>
                    </div>
                    <div id="dynamic-student-fields" class="space-y-4 w-full"></div>
                    <div class="flex justify-end">
                        <button type="submit" id="save-student-btn" class="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold tracking-wide transition shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2">
                            <i class="fas fa-plus-circle"></i> Save Student
                        </button>
                    </div>
                </form>
            </div>

            <!-- Bottom Masterlist View -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-slide-up">
                <div class="p-6 border-b flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50 shrink-0">
                    <div>
                        <h3 class="font-bold text-gray-800 text-lg">Student Masterlist</h3>
                        <p class="text-xs text-gray-400">View and print student QR Identities without grades.</p>
                    </div>
                    <div class="flex flex-col sm:flex-row gap-2 items-center w-full md:w-auto">
                        <button id="bulk-delete-btn" onclick="deleteSelectedStudents()" class="hidden px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition border border-red-200 shadow-sm whitespace-nowrap">
                            <i class="fas fa-trash-alt mr-1"></i> Delete Selected (<span id="bulk-delete-count">0</span>)
                        </button>
                        <div class="relative w-full sm:w-64">
                            <i class="fas fa-search absolute left-3 top-2.5 text-gray-300 text-[10px]"></i>
                            <input type="text" value="${addStudentSearch}" onkeyup="searchAddStudentTable(this.value)" placeholder="Search Name/LRN..." class="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-primary transition">
                        </div>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-white text-gray-400 uppercase font-bold border-b">
                            <tr>
                                <th class="px-6 py-4 w-10 text-center"><input type="checkbox" id="selectAll" onclick="toggleAllStudents(this)" class="w-4 h-4 cursor-pointer align-middle rounded outline-none accent-primary"></th>
                                <th class="px-6 py-4 w-24">LRN</th>
                                <th class="px-6 py-4">Full Name</th>
                                <th class="px-6 py-4 hidden md:table-cell">Adviser</th>
                                <th class="px-6 py-4 hidden md:table-cell">Initial Password</th>
                                <th class="px-6 py-4">Identity Card</th>
                                <th class="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody id="add-student-table-body" class="divide-y divide-gray-50"></tbody>
                    </table>
                </div>
            </div>
    `;
    renderAddStudentTable();
    
    // Render dynamic fields
    const dynamicContainer = document.getElementById('dynamic-student-fields');
    if (dynamicContainer && typeof globalSettings !== 'undefined' && globalSettings.student_fields) {
        try {
            const fields = JSON.parse(globalSettings.student_fields);
            if (Array.isArray(fields) && fields.length > 0) {
                dynamicContainer.innerHTML = fields.map(field => `
                    <div>
                        <label class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">${field}</label>
                        <input type="text" id="m-custom-${field}" class="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:bg-white focus:border-primary outline-none transition shadow-sm" placeholder="Enter ${field}">
                    </div>
                `).join('');
            }
        } catch (e) {}
    }
}

async function manualAdd(e) {
    e.preventDefault();
    const lrn = document.getElementById('m-lrn').value;
    if (lrn.length !== 8) return showMessage("Error: LRN must be exactly 8 numbers.", true);

    // Prevent duplicate LRN registration centrally
    if (students.find(s => String(s.lrn) === lrn)) {
        return showMessage(`Error: A student with LRN ${lrn} is already registered.`, true);
    }

    const l = document.getElementById('m-last').value.trim();
    const f = document.getElementById('m-first').value.trim();
    const m = document.getElementById('m-mi').value.trim();
    const fullName = `${l}, ${f}${m ? ' ' + m + '.' : ''}`;

    // Collect dynamic custom fields if any
    let customData = {};
    document.querySelectorAll('#dynamic-student-fields input').forEach(input => {
        customData[input.id.replace('m-custom-', '')] = input.value.trim();
    });

    const payload = {
        lrn: lrn,
        name: fullName,
        custom_fields: customData,
        section: null,
        adviser: 'Pending Assignment'
    };

    try {
        const btn = document.getElementById('save-student-btn');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        const res = await fetch('/api/students', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Accept': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            showMessage(data.error || 'Failed to save student.', true);
            return;
        }

        // Add to local in-memory array so UI updates instantly
        students.push({
            id: data.id,
            lrn: data.lrn,
            name: data.name,
            section: data.section,
            adviser: data.adviser || 'Pending Assignment',
            gwa: 0, attendance: 0, status: 'Active', subjects: []
        });

        logActivity(`Manually registered student: ${name}`);
        showMessage('Student Profile Created Successfully.');
        navigate('add-student');
    } catch (err) {
        showMessage('Network error. Please try again.', true);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus-circle"></i> Save Student'; }
    }
}

async function deleteStudentFromDB(id, lrn) {
    if (!confirm('Delete this student?')) return;
    
    const studentToRestore = students.find(s => s.lrn === lrn);
    if (!studentToRestore) return;
    
    // Optimistically remove from UI
    students = students.filter(s => s.lrn !== lrn);
    navigate('add-student');
    
    showUndoToast(`Deleted student ${studentToRestore.name}`, 
    async () => {
        // Undo Action
        students.push(studentToRestore);
        navigate('add-student');
        showMessage('Student restored.');
    }, 
    async () => {
        // Finalize Action
        try {
            const res = await fetch(`/api/students/${id}`, { method: 'DELETE', headers: { 'Accept': 'application/json' } });
            if (!res.ok) {
                showMessage('Failed to delete student.', true);
                students.push(studentToRestore);
                navigate('add-student');
            }
        } catch {
            showMessage('Network error.', true);
            students.push(studentToRestore);
            navigate('add-student');
        }
    });
}

function toggleAllStudents(source) {
    const checkboxes = document.querySelectorAll('.student-select');
    checkboxes.forEach(cb => cb.checked = source.checked);
    toggleAddStudentDelBtn();
}

function toggleAddStudentDelBtn() {
    const checked = document.querySelectorAll('.student-select:checked');
    const btn = document.getElementById('bulk-delete-btn');
    if (btn) {
        if (checked.length > 0) {
            btn.classList.remove('hidden');
            document.getElementById('bulk-delete-count').textContent = checked.length;
        } else {
            btn.classList.add('hidden');
        }
    }
}

async function deleteSelectedStudents() {
    const checked = Array.from(document.querySelectorAll('.student-select:checked'));
    if (checked.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${checked.length} selected student(s)?`)) return;

    const ids = checked.map(cb => cb.value).filter(id => id && id !== 'undefined' && id !== 'null');

    const btn = document.getElementById('bulk-delete-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Deleting...';
    }

    try {
        const res = await fetch('/api/students/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ ids })
        });

        if (res.ok) {
            const deletedIdsStr = ids.map(String);
            students = students.filter(s => !deletedIdsStr.includes(String(s.id)));

            showMessage(`${checked.length} student(s) deleted successfully.`);
            navigate('add-student');
        } else {
            showMessage('Failed to delete students.', true);
        }
    } catch {
        showMessage('Network error during bulk delete.', true);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-trash-alt mr-1"></i> Delete Selected (<span id="bulk-delete-count">0</span>)';
            btn.classList.add('hidden');
        }

        const selectAll = document.getElementById('selectAll');
        if (selectAll) selectAll.checked = false;
    }
}

function searchAddStudentTable(val) {
    addStudentSearch = val.toLowerCase();
    renderAddStudentTable();
}

function changeAddStudentSection(val) {
    addStudentSection = val;
    renderAddStudentTable();
}

function renderAddStudentTable() {
    const tbody = document.getElementById('add-student-table-body');
    if (!tbody) return;

    let filtered = students;
    if (addStudentSearch !== '') {
        filtered = filtered.filter(s =>
            s.name.toLowerCase().includes(addStudentSearch) ||
            String(s.lrn).includes(addStudentSearch)
        );
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-gray-400 italic">No students found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(s => {
        const adviseTeacher = teachers.find(t => t.is_adviser && (t.section || '').split(',').map(x => x.trim()).includes(s.section));
        const advName = adviseTeacher ? adviseTeacher.name : 'Pending Assignment';

        return `
        <tr class="hover:bg-gray-50 transition border-b border-gray-50">
            <td class="px-6 py-4 text-center">
                <input type="checkbox" class="student-select w-4 h-4 cursor-pointer align-middle rounded outline-none accent-primary" value="${s.id}" data-lrn="${s.lrn}" onclick="toggleAddStudentDelBtn()">
            </td>
            <td class="px-6 py-4 font-mono text-gray-400">${s.lrn}</td>
            <td class="px-6 py-4 font-bold text-gray-800">${s.name}</td>
            <td class="px-6 py-4 text-gray-500 hidden md:table-cell">${advName}</td>
            <td class="px-6 py-4 font-mono text-gray-500 hidden md:table-cell relative group">
                <span class="blur-sm group-hover:blur-none transition select-all pl-1 border-l-2 border-primary/40">${s.plain_password || '<span class="italic text-gray-300 font-sans">Not set</span>'}</span>
            </td>
            <td class="px-6 py-4">
                <button onclick="showQRModal('${s.lrn}')" class="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-[10px] font-bold hover:bg-green-100 transition shadow-sm border border-green-100 flex items-center gap-1">
                    <i class="fas fa-qrcode"></i> ID Card
                </button>
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center gap-1.5">
                    <button onclick="showReport(students.find(x => x.lrn === '${s.lrn}'))" class="px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition border border-blue-100 flex items-center gap-1">
                        <i class="fas fa-file-alt"></i> Report
                    </button>
                    <button onclick="deleteStudentFromDB(${s.id || 'null'}, '${s.lrn}')" class="px-2.5 py-1.5 bg-red-50 text-red-500 rounded-lg text-[10px] font-bold hover:bg-red-100 transition flex items-center gap-1">
                        <i class="fas fa-trash"></i> Del
                    </button>
                </div>
            </td>
        </tr>
    `;
    }).join('');
}
