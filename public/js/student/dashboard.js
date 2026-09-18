/**
 * student/dashboard.js — Student Portal Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    initStudentDashboard();
});

function getStudentSession() {
    const session = sessionStorage.getItem('cnhs_student_session');
    if (!session) return null;
    try {
        return JSON.parse(session);
    } catch {
        return null;
    }
}

function logoutStudent() {
    sessionStorage.removeItem('cnhs_student_session');
    window.location.href = '/login/student';
}

window.studentData = null;
window.activeQuarter = null; // null means 'All Quarters' or default to 1

async function initStudentDashboard() {
    const student = getStudentSession();
    if (!student || student.role !== 'student') {
        window.location.href = '/login/student';
        return;
    }

    // Populate Header
    document.getElementById('nav-student-name').innerText = student.name;
    document.getElementById('nav-student-lrn').innerText = student.lrn;
    
    document.getElementById('student-name').innerText = student.name;
    document.getElementById('student-lrn').innerText = student.lrn;
    
    const unameEl = document.getElementById('student-username');
    if(unameEl) unameEl.innerText = student.lrn;
    
    // Set Avatar securely
    const avatarUrl = student.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=166534&color=fff&font-size=0.4&bold=true`;
    document.getElementById('profile-avatar').src = avatarUrl;
    
    if (student.has_qr_pin) {
        document.getElementById('pin-status-text').innerText = 'Change QR PIN';
        document.getElementById('pin-status-text').previousElementSibling.className = 'fas fa-fingerprint text-green-500';
    }

    try {
        // Fetch specific student subjects and compute overall display
        const res = await fetch(`/api/students/${student.lrn}/subjects?with_name=1`, {
            headers: { 'Accept': 'application/json' }
        });

        if (!res.ok) throw new Error("Could not fetch academic records.");
        
        window.studentData = await res.json();
        
        // Populate Enrollment Selector Menu
        const selector = document.getElementById('enrollment-selector');
        let history = window.studentData.enrollment_history || [];
        
        // Check if there's an active current year enrollment not explicitly in history (from primary student table)
        if (history.length === 0 && window.studentData.section) {
            history.push({
                school_year: window.currentRecordSchoolYear || '2025-2026',
                section: window.studentData.section,
                adviser: window.studentData.adviser || 'Pending Assignment'
            });
        }
        
        // Also ensure any subjects we fetched have their school years in the dropdown, even if not explicitly in enrollment array
        const subjectYears = new Set(window.studentData.subjects.map(s => s.school_year).filter(Boolean));
        subjectYears.forEach(y => {
            if (!history.find(h => h.school_year === y)) {
                history.push({ school_year: y, section: 'Unknown Section', adviser: 'Pending Assignment' });
            }
        });

        // Sort history descending by year (basic string sort works for YYYY-YYYY format)
        history.sort((a, b) => b.school_year.localeCompare(a.school_year));
        
        if (history.length > 0) {
            selector.innerHTML = history.map((h, i) => `<option value="${i}">SY ${h.school_year} — ${h.section}</option>`).join('');
            selector.classList.remove('hidden');
        } else {
            selector.classList.add('hidden');
            document.getElementById('student-section').innerText = 'Unassigned';
            document.getElementById('student-adviser').innerText = 'Pending Assignment';
        }

        renderEnrolledGrades();

    } catch (e) {
        console.error("Dashboard init error:", e);
        document.getElementById('grades-table-body').innerHTML = `<tr><td colspan="5" class="py-8 text-center text-sm font-bold text-red-500 bg-red-50">Error pulling records: ${e.message}</td></tr>`;
    } finally {
        calculateQuarterAverages();
        // Default to the current quarter or 1
        const latestQ = window.studentData?.subjects?.length ? Math.max(...window.studentData.subjects.map(s => parseInt(s.quarter))) : 1;
        setActiveQuarter(latestQ);

        document.getElementById('loading-spinner').classList.add('hidden');
        document.getElementById('dashboard-content').classList.remove('hidden');
    }
}

function calculateQuarterAverages() {
    if (!window.studentData || !window.studentData.subjects) return;
    
    // Quick SHS check
    const secName = (window.studentData.section || '').toLowerCase();
    const isSHS = secName.includes('11') || secName.includes('12') || window.studentsAnalyticsLevel === 'SH';
    const maxQ = isSHS ? 3 : 4;

    for (let q = 1; q <= maxQ; q++) {
        const qSubjects = window.studentData.subjects.filter(s => parseInt(s.quarter) === q && s.g);
        const avgEl = document.getElementById(`q${q}-avg`);
        
        if (qSubjects.length > 0) {
            const sum = qSubjects.reduce((acc, s) => acc + parseFloat(s.g), 0);
            const avg = (sum / qSubjects.length).toFixed(2);
            if (avgEl) avgEl.innerText = avg;
        } else {
            if (avgEl) avgEl.innerText = '--';
        }
    }
}

function setActiveQuarter(q) {
    // Deprecated for Matrix view, left empty to prevent console errors if called
}

async function renderEnrolledGrades() {
    if (!window.studentData) return;
    
    const selector = document.getElementById('enrollment-selector');
    const history = window.studentData.enrollment_history || [];
    
    let currentEnrollment = null;
    if (selector && selector.value !== '') {
        currentEnrollment = history[selector.value];
    } else if (history.length > 0) {
        currentEnrollment = history[0]; // Default to most recent
    }

    if (currentEnrollment) {
        document.getElementById('student-section').innerText = currentEnrollment.section || 'Unassigned';
        document.getElementById('student-adviser').innerText = currentEnrollment.adviser || 'Pending Assignment';
    } else {
        document.getElementById('student-section').innerText = window.studentData.section || 'Unassigned';
        document.getElementById('student-adviser').innerText = window.studentData.adviser || 'Pending Assignment';
    }

    const syTarget = currentEnrollment ? currentEnrollment.school_year : null;
    
    document.getElementById('active-quarter-label').innerText = 'ANNUAL GRADE MATRIX';
    
    // Filter subjects by the selected school year
    let subjects = window.studentData.subjects.filter(s => !syTarget || s.school_year === syTarget);
    
    // Group by Subject Name for the Matrix
    let groupedSubjects = {};
    
    // Determine standard subjects by grade level (JHS 7-10)
    let stdSubjects = [];
    let sectionName = (currentEnrollment ? currentEnrollment.section : window.studentData.section) || '';
    let secLower = sectionName.toLowerCase();
    let gradeLevel = null;
    
    if (secLower.match(/\b12\b/) || secLower.startsWith('12')) gradeLevel = 12;
    else if (secLower.match(/\b11\b/) || secLower.startsWith('11')) gradeLevel = 11;
    else if (secLower.match(/\b10\b/) || secLower.startsWith('10')) gradeLevel = 10;
    else if (secLower.match(/\b9\b/) || secLower.startsWith('9')) gradeLevel = 9;
    else if (secLower.match(/\b8\b/) || secLower.startsWith('8')) gradeLevel = 8;
    else if (secLower.match(/\b7\b/) || secLower.startsWith('7')) gradeLevel = 7;
    
    const isSHS = gradeLevel === 11 || gradeLevel === 12 || window.studentsAnalyticsLevel === 'SH';
    const maxTerms = isSHS ? 3 : 4;

    // Auto-inject standard curriculum subjects for JHS
    if ((gradeLevel >= 7 && gradeLevel <= 10) || (!isSHS)) {
        stdSubjects = ['Filipino', 'English', 'Mathematics', 'Science', 'Araling Panlipunan', 'MAPEH', 'ESP', 'TLE'];
    }
    
    stdSubjects.forEach(sub => {
        groupedSubjects[sub] = { 
            name: sub, 
            school_year: syTarget || window.currentRecordSchoolYear || '2025-2026', 
            q1: null, q2: null, q3: null, q4: null 
        };
    });

    subjects.forEach(s => {
        if (!groupedSubjects[s.n]) {
            groupedSubjects[s.n] = { name: s.n, school_year: s.school_year, q1: null, q2: null, q3: null, q4: null };
        }
        if (s.g && s.quarter) {
            groupedSubjects[s.n]['q' + parseInt(s.quarter)] = parseFloat(s.g);
        }
    });

    const matrixData = Object.values(groupedSubjects);
    
    // Render Grades Table
    const tbody = document.getElementById('grades-table-body');
    const tfoot = document.getElementById('grades-table-foot');
    tbody.innerHTML = '';

    if (matrixData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-sm font-bold text-gray-400"><i class="fas fa-folder-open mb-2 text-2xl text-gray-300 block"></i>No grades encoded for this school year yet.</td></tr>`;
        tfoot.classList.add('hidden');
    } else {
        let totalFinalGrades = 0;
        let countFinalGrades = 0;
        
        matrixData.forEach(sub => {
            const tr = document.createElement('tr');
            tr.className = 'group hover:bg-gray-50/50 transition-colors border-b border-gray-50 last:border-0';
            
            let q1Html = sub.q1 ? sub.q1 : '<span class="text-gray-300">--</span>';
            let q2Html = sub.q2 ? sub.q2 : '<span class="text-gray-300">--</span>';
            let q3Html = sub.q3 ? sub.q3 : '<span class="text-gray-300">--</span>';
            let q4Html = sub.q4 ? sub.q4 : '<span class="text-gray-300">--</span>';
            
            let finalAvg = 0;
            let qCount = 0;
            if(sub.q1) { finalAvg += sub.q1; qCount++; }
            if(sub.q2) { finalAvg += sub.q2; qCount++; }
            if(sub.q3) { finalAvg += sub.q3; qCount++; }
            if(!isSHS && sub.q4) { finalAvg += sub.q4; qCount++; }
            
            let finalGradeHtml = '--';
            let remarksHtml = '--';
            
            if (qCount > 0) {
                const calculatedFinal = finalAvg / qCount;
                totalFinalGrades += calculatedFinal;
                countFinalGrades++;
                
                finalGradeHtml = `<span class="bg-gray-100 px-3 py-1 text-gray-700 font-black rounded-lg border border-gray-200">${calculatedFinal.toFixed(0)}</span>`;
                
                if (calculatedFinal >= 75) {
                    remarksHtml = `<span class="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded">PASSED</span>`;
                } else {
                    remarksHtml = `<span class="text-red-500 font-bold text-xs bg-red-50 px-2 py-1 rounded">FAILED</span>`;
                }
            }

            tr.innerHTML = `
                <td class="py-4 px-6 border-r border-gray-50">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary/5 group-hover:text-primary transition-all">
                            <i class="fas fa-book text-[10px]"></i>
                        </div>
                        <div>
                            <p class="text-xs font-black text-gray-800 tracking-tight">${sub.name}</p>
                            <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">SY ${sub.school_year}</p>
                        </div>
                    </div>
                </td>
                <td class="py-4 px-4 border-r border-gray-50 text-center text-sm font-bold text-gray-600">${q1Html}</td>
                <td class="py-4 px-4 border-r border-gray-50 text-center text-sm font-bold text-gray-600">${q2Html}</td>
                <td class="py-4 px-4 border-r border-gray-50 text-center text-sm font-bold text-gray-600">${q3Html}</td>
                ${!isSHS ? `<td class="py-4 px-4 border-r border-gray-50 text-center text-sm font-bold text-gray-600">${q4Html}</td>` : ''}
                <td class="py-4 px-4 border-r border-gray-50 text-center text-sm font-black text-gray-800 bg-gray-50/50">${finalGradeHtml}</td>
                <td class="py-4 px-4 text-center">${remarksHtml}</td>
            `;
            tbody.appendChild(tr);
        });

        // Set table headers dynamically based on isSHS
        const theadHtml = `
            <tr>
                <th class="py-4 px-6 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest border-r border-gray-50">Learning Area</th>
                <th class="py-4 px-4 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest border-r border-gray-50 w-24">${isSHS ? 'Term 1' : 'Q1'}</th>
                <th class="py-4 px-4 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest border-r border-gray-50 w-24">${isSHS ? 'Term 2' : 'Q2'}</th>
                <th class="py-4 px-4 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest border-r border-gray-50 w-24">${isSHS ? 'Term 3' : 'Q3'}</th>
                ${!isSHS ? `<th class="py-4 px-4 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest border-r border-gray-50 w-24">Q4</th>` : ''}
                <th class="py-4 px-4 text-center text-[10px] font-black text-primary uppercase tracking-widest border-r border-gray-50 w-24 bg-primary/5">Final</th>
                <th class="py-4 px-4 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest w-24">Remarks</th>
            </tr>
        `;
        const headEl = document.getElementById('grades-table-head');
        if (headEl) headEl.innerHTML = theadHtml;

        const subtitle = document.getElementById('grades-subtitle');
        if (subtitle) subtitle.innerText = isSHS ? 'Term Grade Breakdown' : 'Quarterly Grade Breakdown';

        tfoot.classList.remove('hidden');
        
        // Show Footer GWA
        if (countFinalGrades > 0) {
            const matrixGwa = totalFinalGrades / countFinalGrades;
            document.getElementById('matrix-gwa-val').innerText = matrixGwa.toFixed(2);
            
            const remarksEl = document.getElementById('matrix-gwa-remarks');
            if (matrixGwa >= 75) {
                remarksEl.innerHTML = `<span class="text-green-600 font-bold text-sm bg-green-50 px-3 py-1.5 rounded-full border border-green-100">PASSED</span>`;
            } else {
                remarksEl.innerHTML = `<span class="text-red-600 font-bold text-sm bg-red-50 px-3 py-1.5 rounded-full border border-red-100">FAILED</span>`;
            }
            tfoot.classList.remove('hidden');
        } else {
            tfoot.classList.add('hidden');
        }
    }

    // Overview Stats relative to selected year
    let totalGrade = 0;
    let countedGrades = 0;
    subjects.forEach(s => {
        if (s.g) {
            totalGrade += parseFloat(s.g);
            countedGrades++;
        }
    });

    const gwaVal = countedGrades > 0 ? (totalGrade / countedGrades) : 0;
    const gwaBadge = document.getElementById('honor-badge');
    
    if (gwaVal > 0) {
        document.getElementById('student-gwa').innerText = gwaVal.toFixed(2);
        let isSH = false;
        if (currentUser && currentUser.section) {
            const match = currentUser.section.match(/Grade (\d+)/i);
            if (match && parseInt(match[1]) >= 11) isSH = true;
        }

        const hasFailing = subjects.some(s => s.g && parseFloat(s.g) < 75);

        // Honors Logic
        if (isSH) {
            if (gwaVal >= 90 && !hasFailing) { gwaBadge.innerText = "Academic Excellence Award"; gwaBadge.classList.remove('hidden'); }
            else { gwaBadge.classList.add('hidden'); }
        } else {
            if (gwaVal >= 98 && !hasFailing) { gwaBadge.innerText = "With Highest Honors"; gwaBadge.classList.remove('hidden'); }
            else if (gwaVal >= 95 && !hasFailing) { gwaBadge.innerText = "With High Honors"; gwaBadge.classList.remove('hidden'); }
            else if (gwaVal >= 90 && !hasFailing) { gwaBadge.innerText = "With Honors"; gwaBadge.classList.remove('hidden'); }
            else { gwaBadge.classList.add('hidden'); }
        }
    } else {
        document.getElementById('student-gwa').innerText = '--';
        gwaBadge.classList.add('hidden');
    }

    // Risk Assessment
    let risk = 'Pending';
    const failingSubjects = subjects.filter(s => s.g && parseFloat(s.g) < 75).length;
    if (countedGrades > 0) {
        if (failingSubjects >= 3) risk = 'High';
        else if (failingSubjects > 0) risk = 'Moderate';
        else risk = 'Low';
    }

    const riskEl = document.getElementById('student-risk');
    const riskIcon = document.getElementById('risk-icon');
    
    riskEl.innerText = risk;
    riskIcon.className = 'w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400';
    riskEl.classList.remove('text-green-600', 'text-yellow-600', 'text-red-500');
    
    if (risk === 'Low') {
        riskEl.classList.add('text-green-600');
        riskIcon.className = 'w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-500';
        riskIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
    } else if (risk === 'Moderate') {
        riskEl.classList.add('text-yellow-600');
        riskIcon.className = 'w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-500';
        riskIcon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
    } else if (risk === 'High') {
        riskEl.classList.add('text-red-500');
        riskIcon.className = 'w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 animate-pulse';
        riskIcon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
    }

    // Attendance (Calculate relative to selected records if available)
    const session = getStudentSession();
    const lrn = session ? session.lrn : null;
    if (lrn) {
        fetch(`/api/attendance/${lrn}`)
            .then(r => r.ok ? r.json() : [])
            .then(attData => {
                let totalMarks = 0;
                let presentMarks = 0;
                
                // Filter attendance to the targeted school year if provided
                const yearlyAtt = syTarget ? attData.filter(a => a.school_year === syTarget) : attData;

                yearlyAtt.forEach(row => {
                    if (row.marks && Array.isArray(row.marks)) {
                        row.marks.forEach(m => {
                            if (m === '/') presentMarks++;
                            if (m !== '') totalMarks++;
                        });
                    }
                });
                
                if (totalMarks > 0) {
                    const pct = ((presentMarks / totalMarks) * 100).toFixed(0);
                    document.getElementById('student-attendance').innerText = pct;
                } else {
                    document.getElementById('student-attendance').innerText = "--"; 
                }
            })
            .catch(() => {
                document.getElementById('student-attendance').innerText = "--";
            });
    }
}

// --- Profile Upload Logic ---
function triggerProfileUpload() {
    document.getElementById('profile-upload-input').click();
}

async function handleProfileUpload(input) {
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    const imgElement = document.getElementById('profile-avatar');
    const originalSrc = imgElement.src;
    imgElement.style.opacity = '0.5';

    try {
        const compressedBlob = await compressImage(file, 400);
        
        const formData = new FormData();
        const student = getStudentSession();
        formData.append('id', student.id);
        formData.append('image', compressedBlob, 'profile.webp');

        const res = await fetch('/api/students/upload-profile', {
            method: 'POST',
            headers: { 'Accept': 'application/json' },
            body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed.');

        // Success
        student.profile_picture = data.path;
        sessionStorage.setItem('cnhs_student_session', JSON.stringify(student));

        imgElement.src = data.path;
        imgElement.style.opacity = '1';

    } catch (e) {
        console.error(e);
        imgElement.src = originalSrc;
        imgElement.style.opacity = '1';
        alert("Profile update failed: " + e.message);
    }
}

function compressImage(file, maxSize) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) { height *= maxSize / width; width = maxSize; }
                } else {
                    if (height > maxSize) { width *= maxSize / height; height = maxSize; }
                }

                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(blob => resolve(blob), 'image/webp', 0.8);
            };
            img.onerror = () => reject(new Error("Failed to read image."));
        };
        reader.onerror = () => reject(new Error("File reader error."));
    });
}

// --- QR PIN Logic ---
function openQrPinModal() {
    document.getElementById('qr-pin-input').value = '';
    document.getElementById('qr-pin-error').classList.add('hidden');
    document.getElementById('qr-pin-modal').classList.remove('hidden');
    document.getElementById('qr-pin-input').focus();
}

function closeQrPinModal() {
    document.getElementById('qr-pin-modal').classList.add('hidden');
}

async function saveQrPin() {
    const pin = document.getElementById('qr-pin-input').value;
    const err = document.getElementById('qr-pin-error');
    err.classList.add('hidden');

    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
        err.innerText = "PIN must be exactly 6 numeric digits.";
        err.classList.remove('hidden');
        return;
    }

    const btn = document.getElementById('qr-pin-save-btn');
    const ogText = btn.innerText;
    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        const student = getStudentSession();
        const res = await fetch('/api/students/setup-qr-pin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ lrn: student.lrn, pin: pin })
        });
        
        let data;
        try {
            data = await res.json();
        } catch (je) {
            throw new Error("Server error: Unable to parse response.");
        }

        if(!res.ok) {
            console.error("PIN Save Error Data:", data);
            throw new Error(data.error || data.message || "Failed to save PIN.");
        }
        
        // Update session state
        student.has_qr_pin = true;
        sessionStorage.setItem('cnhs_student_session', JSON.stringify(student));
        
        document.getElementById('pin-status-text').innerText = 'Change QR PIN';
        document.getElementById('pin-status-text').previousElementSibling.className = 'fas fa-fingerprint text-green-500';
        
        closeQrPinModal();
        
    } catch(e) {
        err.innerText = e.message;
        err.classList.remove('hidden');
    } finally {
        btn.innerText = ogText;
        btn.disabled = false;
    }
}

