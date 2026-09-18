/**
 * app.js — CNHS AI-Driven Student Evaluation System
 * Core shared logic: data, state, auth, navigation, modals, QR, AI scanner, chatbot.
 * All render functions are in the page-specific JS files (admin/*.js).
 */

// NOTE: API_KEY is now kept server-side for the chatbot (secure).
// It is only used here for the AI Document Scanner image processing.
const API_KEY = window.APP_API_KEY || ""; // Set via server-side meta tag or window variable
const currentUser = { role: null, name: '', id: '' };
let pendingLrn = ''; // Global tracker for student authentication flow

let globalSettings = {};

async function fetchSettings() {
    try {
        const res = await fetch('/api/maintenance/settings');
        const data = await res.json();
        if (data.settings) {
            globalSettings = data.settings;
            
            // Apply global settings to UI immediately upon fetching
            
            // 1. Sidebar App Name
            if (globalSettings.app_name) {
                const sidebarTitle = document.querySelector('.sidebar-text h1');
                if (sidebarTitle) sidebarTitle.textContent = globalSettings.app_name;
            }
            
            // 2. Global School Year Select
            const globalSelect = document.getElementById('global-school-year');
            if (globalSelect && globalSettings.school_years) {
                try {
                    let syList = JSON.parse(globalSettings.school_years);
                    if (Array.isArray(syList) && syList.length > 0) {
                        let active = globalSettings.active_sy || window.currentRecordSchoolYear || '2025-2026';
                        // if currentRecordSchoolYear is not in syList, maybe it was set via URL. Let's just render syList.
                        if (!syList.includes(active)) active = syList[0]; // fallback
                        
                        globalSelect.innerHTML = syList.map(sy => `<option value="${sy}" ${sy === active ? 'selected' : ''}>S.Y. ${sy}</option>`).join('');
                        
                        // If it changed, we should update currentRecordSchoolYear
                        if (window.currentRecordSchoolYear !== active) {
                            window.currentRecordSchoolYear = active;
                        }
                    }
                } catch(e){}
            }
        }
    } catch (e) {
        console.error('Failed to fetch settings', e);
    }
}

const coreSubjects = ['Business Math', 'Science', 'English', 'Filipino', 'A.P.', 'MAPEH'];
let MAX_WW = parseInt(localStorage.getItem('system_max_ww')) || 5;
let MAX_PT = parseInt(localStorage.getItem('system_max_pt')) || 5;

// --- DepEd Grading Helpers ---
function getTransmutedGrade(percent) {
    if (percent === null || percent === undefined || isNaN(percent)) return null;
    let p = parseFloat(percent);
    if (p > 100) p = 100;
    if (p === 100) return 100;

    // DepEd DO 8 s. 2015 Transmutation Table implementation
    if (p >= 60) {
        // 60 -> 75, each step of 1.6 adds 1 point
        let step = Math.floor((p - 60) / 1.6);
        let grade = 75 + step;
        return grade > 99 ? 99 : grade;
    } else {
        // 0 -> 60, each step of 4 adds 1 point
        let step = Math.floor(p / 4);
        let grade = 60 + step;
        return grade > 74 ? 74 : grade;
    }
}

function getSubjectWeights(subject, studentObj = null) {
    const s = (subject || '').toLowerCase();

    // 1. Check for custom weights saved by the teacher in localStorage
    const customWeights = localStorage.getItem('grading_weights_' + s);
    if (customWeights) {
        try {
            const parsed = JSON.parse(customWeights);
            if (parsed && typeof parsed.ww === 'number' && typeof parsed.pt === 'number' && typeof parsed.qa === 'number') {
                return parsed;
            }
        } catch (e) {
            console.error('Failed to parse custom weights', e);
        }
    }

    // Check if Senior High based on student object or global context
    let isSH = window.studentsAnalyticsLevel === 'SH';
    if (studentObj && studentObj.section) {
        // Quick heuristic: If section contains Grade 11 or Grade 12
        const checkSec = studentObj.section.toLowerCase();
        if (checkSec.includes('grade 11') || checkSec.includes('grade 12') || checkSec.includes('gr 11') || checkSec.includes('gr 12')) {
            isSH = true;
        }
    }

    if (isSH) {
        // Core SHS DepEd Distribution (DO 8 s. 2015) 
        // Defaulting to 25-50-25 for all SHS Subjects for now
        return { ww: 0.25, pt: 0.50, qa: 0.25 };
    }

    // Core DepEd Grade 7-10 Distribution (DO 8 s. 2015)

    // Math & Science: 40-40-20
    if (s.includes('math') || s.includes('science')) {
        return { ww: 0.40, pt: 0.40, qa: 0.20 };
    }

    // MAPEH, EPP, TLE: 20-60-20
    if (s.includes('mapeh') || s.includes('music') || s.includes('arts') || s.includes('pe') || s.includes('health') || s.includes('tle') || s.includes('epp')) {
        return { ww: 0.20, pt: 0.60, qa: 0.20 };
    }

    // Languages, AP, EsP: 30-50-20 (Default for JHS)
    return { ww: 0.30, pt: 0.50, qa: 0.20 };
}

function addWWColumn() {
    if (MAX_WW < 10) {
        MAX_WW++;
        localStorage.setItem('system_max_ww', MAX_WW);
        if (typeof renderRecords === 'function') renderRecords(document.getElementById('content-area'));
    }
}

function removeWWColumn() {
    if (MAX_WW > 1) {
        MAX_WW--;
        localStorage.setItem('system_max_ww', MAX_WW);
        if (typeof renderRecords === 'function') renderRecords(document.getElementById('content-area'));
    }
}

function addPTColumn() {
    if (MAX_PT < 10) {
        MAX_PT++;
        localStorage.setItem('system_max_pt', MAX_PT);
        if (typeof renderRecords === 'function') renderRecords(document.getElementById('content-area'));
    }
}

function removePTColumn() {
    if (MAX_PT > 1) {
        MAX_PT--;
        localStorage.setItem('system_max_pt', MAX_PT);
        if (typeof renderRecords === 'function') renderRecords(document.getElementById('content-area'));
    }
}

// Highest Possible Scores global tracker
let maxScores = {};
try {
    const savedMax = localStorage.getItem('system_max_scores');
    if (savedMax) {
        maxScores = JSON.parse(savedMax);
    } else {
        // Fallback defaults
        maxScores = {
            'Business Math': { ww1: 10, ww2: 10, pt1: 50, pt2: 50, qa: 50 },
            'Science': { ww1: 20, ww2: 20, ww3: 15, pt1: 100, qa: 60 }
        };
    }
} catch {
    maxScores = {};
}

function saveMaxScores() {
    localStorage.setItem('system_max_scores', JSON.stringify(maxScores));
}

let students = [];

// Central computation logic for individual subject based on raw scores & max scores
function recalcStudentSubject(s, subject) {
    let sub = s.subjects.find(x => x.n === subject);
    if (!sub) {
        sub = { n: subject, g: null, quarter: window.currentRecordQuarter || 1 };
        s.subjects.push(sub);
        if (!s.allSubjects) s.allSubjects = [];
        s.allSubjects.push(sub);
    }
    const quarterKey = `${subject}_Q${window.currentRecordQuarter || 1}`;
    let mScores = maxScores[quarterKey] || maxScores[subject] || {};

    let wwRaw = 0, wwMax = 0, wwHasScore = false;
    for (let i = 1; i <= 10; i++) {
        if (sub['ww' + i] !== null && sub['ww' + i] !== undefined && sub['ww' + i] !== '') {
            wwRaw += parseFloat(sub['ww' + i]);
            wwHasScore = true;
        }
        if (mScores['ww' + i]) wwMax += parseFloat(mScores['ww' + i]);
    }

    let wwPS = 0;
    if (wwMax > 0) {
        wwPS = (wwRaw / wwMax) * 100;
    } else if (wwHasScore) {
        let sum = 0, count = 0;
        for (let i = 1; i <= 10; i++) {
            if (sub['ww' + i] !== null && sub['ww' + i] !== undefined && sub['ww' + i] !== '') { sum += parseFloat(sub['ww' + i]); count++; }
        }
        wwPS = sum / count;
    }
    if (wwPS > 100) wwPS = 100;

    let ptRaw = 0, ptMax = 0, ptHasScore = false;
    for (let i = 1; i <= 10; i++) {
        if (sub['pt' + i] !== null && sub['pt' + i] !== undefined && sub['pt' + i] !== '') {
            ptRaw += parseFloat(sub['pt' + i]);
            ptHasScore = true;
        }
        if (mScores['pt' + i]) ptMax += parseFloat(mScores['pt' + i]);
    }

    let ptPS = 0;
    if (ptMax > 0) {
        ptPS = (ptRaw / ptMax) * 100;
    } else if (ptHasScore) {
        let sum = 0, count = 0;
        for (let i = 1; i <= 10; i++) {
            if (sub['pt' + i] !== null && sub['pt' + i] !== undefined && sub['pt' + i] !== '') { sum += parseFloat(sub['pt' + i]); count++; }
        }
        ptPS = sum / count;
    }
    if (ptPS > 100) ptPS = 100;

    let qaRaw = parseFloat(sub['qa']);
    let qaHasScore = !isNaN(qaRaw);
    let qaMax = parseFloat(mScores['qa']) || 0;

    let qaPS = 0;
    if (qaMax > 0 && qaHasScore) {
        qaPS = (qaRaw / qaMax) * 100;
    } else if (qaHasScore) {
        qaPS = qaRaw;
    }
    if (qaPS > 100) qaPS = 100;

    if (wwHasScore || ptHasScore || qaHasScore) {
        const weights = getSubjectWeights(subject, s);

        // Exact mathematical components for E-Class Record
        const wwWS = wwPS * weights.ww;
        const ptWS = ptPS * weights.pt;
        const qaWS = qaPS * weights.qa;

        const initialGrade = wwWS + ptWS + qaWS;

        sub.g = getTransmutedGrade(initialGrade);

        sub.wwTotal = wwHasScore ? wwRaw.toFixed(2).replace(/\.00$/, '') : '-';
        sub.wwPS = wwPS.toFixed(2);
        sub.wwWS = wwWS.toFixed(2);

        sub.ptTotal = ptHasScore ? ptRaw.toFixed(2).replace(/\.00$/, '') : '-';
        sub.ptPS = ptPS.toFixed(2);
        sub.ptWS = ptWS.toFixed(2);

        sub.qaTotal = qaHasScore ? qaRaw.toFixed(2).replace(/\.00$/, '') : '-';
        sub.qaPS = qaPS.toFixed(2);
        sub.qaWS = qaWS.toFixed(2);

        sub.initialGrade = initialGrade.toFixed(2);
    } else {
        // preserve sub.g if it came from DB and we have no component scores to recalc
        sub.g = sub.g || null;
        sub.wwTotal = '-'; sub.wwPS = '-'; sub.wwWS = '-';
        sub.ptTotal = '-'; sub.ptPS = '-'; sub.ptWS = '-';
        sub.qaTotal = '-'; sub.qaPS = '-'; sub.qaWS = '-';
        sub.initialGrade = '-';
    }
}

// Global GWA computation
function computeStudentGWA(s) {
    let totalGWA = 0; let subCount = 0;
    if (s.subjects) {
        s.subjects.forEach(sub => {
            if (sub.g !== null && sub.g !== undefined && parseFloat(sub.g) > 0) {
                totalGWA += parseFloat(sub.g);
                subCount++;
            }
        });
    }
    s.gwa = subCount > 0 ? parseFloat((totalGWA / subCount).toFixed(2)) : 0;
    s.risk = s.gwa > 0 && s.gwa < 75 ? 'High' : (s.gwa >= 75 ? 'Low' : 'Pending');
}

// Initialize All Grades (Handled by initAppData now)
/*
students.forEach(s => {
    if (s.subjects) s.subjects.forEach(sub => recalcStudentSubject(s, sub.n));
    computeStudentGWA(s);
});
*/

let activityLogs = [{ id: 1, user: 'System', action: 'System Initialized', time: new Date().toLocaleString() }];
let teachers = [];
const adminCreds = { user: 'admin', pass: 'admin123' };

/**
 * Load students, teachers, and all subject scores from the database.
 * Called once when the user successfully logs in.
 */
async function initAppData() {
    try {
        await fetchSettings();
        
        const syParam = window.currentRecordSchoolYear || globalSettings.active_sy || '2025-2026';
        const [studRes, teachRes, subjectsRes] = await Promise.all([
            fetch('/api/students?school_year=' + syParam, { headers: { 'Accept': 'application/json' } }),
            fetch('/api/teachers?school_year=' + syParam, { headers: { 'Accept': 'application/json' } }),
            fetch('/api/grades/all-subjects?school_year=' + syParam, { headers: { 'Accept': 'application/json' } })
        ]);

        if (studRes.ok) students = await studRes.json();
        if (teachRes.ok) teachers = await teachRes.json();

        let allSubjectsData = [];
        if (subjectsRes.ok) allSubjectsData = await subjectsRes.json();

        // Ensure each student has a subjects array
        students.forEach(s => { if (!s.subjects) s.subjects = []; });

        // Group the globally fetched subjects by student LRN
        const subjectsByLrn = {};
        allSubjectsData.forEach(row => {
            if (!subjectsByLrn[row.lrn]) subjectsByLrn[row.lrn] = [];
            subjectsByLrn[row.lrn].push(row);
        });

        // Populate local state
        students.forEach(s => {
            s.allSubjects = subjectsByLrn[s.lrn] || [];

            // only populate s.subjects with the active quarter (default 1)
            const activeQ = window.currentRecordQuarter || 1;
            s.subjects = s.allSubjects.filter(sub => (sub.quarter || 1) == activeQ);

            // Only recalculate IF there are raw scores. Otherwise use DB grade.
            s.subjects.forEach(sub => {
                const hasRaw = ['ww1', 'ww2', 'ww3', 'ww4', 'ww5', 'ww6', 'ww7', 'ww8', 'ww9', 'ww10', 'pt1', 'pt2', 'pt3', 'pt4', 'pt5', 'pt6', 'pt7', 'pt8', 'pt9', 'pt10', 'qa'].some(f => sub[f] !== null && sub[f] !== undefined && sub[f] !== '');
                if (hasRaw) recalcStudentSubject(s, sub.n);
            });
            computeStudentGWA(s);
        });

        if (currentUser.role === 'teacher') {
            const adviserSections = (currentUser.section || '').split(',').map(s => s.trim()).filter(Boolean);
            const subjects = (currentUser.subject || '').split(',').map(s => s.trim()).filter(Boolean);
            const teacherSections = new Set(adviserSections);
            
            const pinned = JSON.parse(localStorage.getItem('cnhs_pinned_sections_' + currentUser.id)) || [];
            pinned.forEach(sec => {
                if (sec !== 'all') teacherSections.add(sec);
            });
            
            if (subjects.length > 0) {
                students.forEach(s => {
                    if (s.subjects && s.subjects.some(sub => subjects.includes(sub.n))) {
                        teacherSections.add(s.section);
                    }
                });
            }
            currentUser.handledSections = [...teacherSections].sort();
        }
    } catch (e) {
        console.warn('Could not load data from DB:', e);
    }
}

async function setGlobalSchoolYear(sy) {
    window.currentRecordSchoolYear = sy;

    const content = document.getElementById('content-area');
    if (content) {
        content.innerHTML = `<div class="flex flex-col items-center justify-center p-20 gap-4"><div class="spinner border-primary"></div><p class="text-sm font-bold text-gray-500">Refetching system data for S.Y. ${sy}...</p></div>`;
    }

    await initAppData();

    const activeView = sessionStorage.getItem('cnhs_active_view') || 'dashboard';
    if (typeof navigate === 'function') {
        navigate(activeView, true);
    }
}

let activeFilter = 'total';
let currentMode = '';
let base64Image = '';
let currentSubjectView = null;
let currentRecordSection = 'all';
let currentRecordSearch = '';
window.currentRecordQuarter = 1; // Track which quarter is active in the records UI

// ATTENDANCE CONFIGURATION
const ATT_MONTHS = [
    { m: 'Oct', mIdx: 10, d: 21 }, { m: 'Nov', mIdx: 11, d: 20 }, { m: 'Dec', mIdx: 12, d: 15 },
    { m: 'Jan', mIdx: 1, d: 22 }, { m: 'Feb', mIdx: 2, d: 19 }, { m: 'Mar', mIdx: 3, d: 21 },
    { m: 'Apr', mIdx: 4, d: 20 }, { m: 'May', mIdx: 5, d: 21 }, { m: 'Jun', mIdx: 6, d: 18 },
    { m: 'July', mIdx: 7, d: 15 }
];

// Add Student Table State
let addStudentSection = 'all';
let addStudentSearch = '';

// Global Custom Notification Wrapper (Replaces native alerts)
function showMessage(msg, isError = false) {
    const toast = document.createElement('div');
    toast.className = `fixed top-5 right-5 z-[100] px-6 py-3 rounded-xl shadow-2xl text-white font-bold text-sm transform transition-all duration-300 translate-y-[-150%] opacity-0 ${isError ? 'bg-red-600' : 'bg-primary'}`;
    toast.innerText = msg;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.remove('translate-y-[-150%]', 'opacity-0'), 10);
    setTimeout(() => {
        toast.classList.add('translate-y-[-150%]', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function login(role) {
    const u = document.getElementById('login-user').value.trim();
    const p = document.getElementById('login-pass').value.trim();
    const err = document.getElementById('login-error');
    const errText = document.getElementById('error-text');
    err.classList.add('hidden');

    if (!u || !p) {
        if (errText) errText.innerText = "Please enter both username and password.";
        else err.innerText = "Please enter both username and password.";
        err.classList.remove('hidden');
        return;
    }

    const originalBtnContent = {};
    const btns = document.querySelectorAll('button[onclick*="login"]');
    btns.forEach(b => {
        originalBtnContent[b.innerText] = b.innerHTML;
        b.disabled = true;
        b.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Processing...';
    });

    try {
        currentUser.role = role;
        if (role === 'admin') {
            if (u !== adminCreds.user || p !== adminCreds.pass) {
                // Log failed attempt
                fetch('/api/activity-logs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ action: 'Failed login attempt on Admin Portal: ' + u, user: 'System' })
                }).catch(() => {});
                throw new Error("Invalid username or password.");
            }
            currentUser.name = 'Admin Principal';
            currentUser.id = 'ADM-001';
            currentUser.subject = null;
        } else if (role === 'teacher') {
            const res = await fetch('/api/teachers/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ username: u, password: p })
            });
            if (!res.ok) {
                // Log failed attempt
                fetch('/api/activity-logs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ action: 'Failed login attempt on Teacher Portal: ' + u, user: 'System' })
                }).catch(() => {});
                throw new Error("Invalid username or password.");
            }

            const teacher = await res.json();
            currentUser.name = teacher.name;
            currentUser.id = teacher.id;
            currentUser.db_id = teacher.db_id;
            currentUser.subject = teacher.subject;
            currentUser.isAdviser = teacher.is_adviser || false;
            currentUser.section = teacher.section || null;
            currentUser.profile_picture = teacher.profile_picture || null;
        }

        // Auth success: Load fresh data from DB
        await initAppData();

        // Update Nav UI
        if (role === 'admin') {
            document.getElementById('nav-manage-teachers').classList.remove('hidden');
            document.getElementById('nav-subjects').classList.remove('hidden');
            document.getElementById('nav-assign-section').classList.remove('hidden');
            document.getElementById('nav-logs').classList.remove('hidden');
            document.getElementById('nav-maintenance')?.classList.remove('hidden');
        } else if (currentUser.isAdviser) {
            document.getElementById('nav-adviser').classList.remove('hidden');
        }
        document.getElementById('nav-settings').classList.remove('hidden');

    } catch (e) {
        btns.forEach(b => {
            const text = b.innerText.includes('Admin') ? 'Admin Portal' : 'Teacher Office';
            // Simple restore logic
            if (role === 'admin' && b.innerText.includes('Admin')) b.innerHTML = '<div class="relative flex flex-col items-center gap-2"><i class="fas fa-shield-alt text-accent text-xl"></i><span>Admin Portal</span></div>';
            else if (role === 'teacher' && b.innerText.includes('Teacher')) b.innerHTML = '<div class="relative flex flex-col items-center gap-2"><i class="fas fa-chalkboard-teacher text-primary text-xl"></i><span>Teacher Office</span></div>';
            b.disabled = false;
        });

        if (errText) errText.innerText = e.message;
        else err.innerText = e.message;
        err.classList.remove('hidden');
        return;
    }

    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('role-tag').innerText = role.toUpperCase();
    document.getElementById('user-display-name').innerText = currentUser.name;
    document.getElementById('user-display-role').innerText = role;

    const isInvalidPic = !currentUser.profile_picture || currentUser.profile_picture === 'null' || currentUser.profile_picture === '';
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'User')}&background=166534&color=fff&font-size=0.4`;
    document.getElementById('user-display-avatar').src = isInvalidPic ? defaultAvatar : currentUser.profile_picture;

    // clear inputs for security
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';

    // Save session so refresh doesn't log out
    sessionStorage.setItem('cnhs_session', JSON.stringify(currentUser));

    logActivity(`User Logged In: ${currentUser.name} (${role})`);

    // Update URL without refresh
    const path = `/${role}/dashboard`;
    history.pushState({ view: 'dashboard', role }, '', path);

    navigate('dashboard', true);
}

function logout(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    logActivity(`User Logged Out: ${currentUser.name}`);
    
    let loginRole = currentUser.role || 'admin';
    if (loginRole === 'principal' || loginRole === 'curriculum_coordinator') {
        loginRole = 'admin'; // Route back to the master staff portal
    }
    
    sessionStorage.removeItem('cnhs_session');
    location.href = `/login/${loginRole}`;
}

function logActivity(action) {
    const user = (typeof currentUser !== 'undefined' && currentUser.name) ? currentUser.name : 'System';
    const logEntry = {
        id: activityLogs.length + 1,
        user: user,
        action: action,
        time: new Date().toLocaleString()
    };
    activityLogs.unshift(logEntry);

    // Persist to database asynchronously without blocking
    fetch('/api/activity-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ action: action, user: user })
    }).catch(err => console.warn('Failed to persist activity log', err));
}

function navigate(view, skipPush = false) {
    const area = document.getElementById('content-area');
    const title = document.getElementById('page-title');
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
    document.getElementById(`nav-${view}`)?.classList.add('active');

    // Save current view so it persists across refreshes
    sessionStorage.setItem('cnhs_active_view', view);

    if (!skipPush) {
        let routeMap = {
            'dashboard': 'dashboard',
            'add-student': 'add-students',
            'records': 'records',
            'adviser': 'records',
            'manage-teachers': 'manage-teachers',
            'subjects': 'subjects',
            'assign-section': 'assign-section',
            'logs': 'activity-logs',
            'settings': 'settings',
            'maintenance': 'settings', // Since there's no backend blade for maintenance we use settings route or just dashboard route as anchor
            'analytics': 'analytics'
        };
        const urlSegment = routeMap[view] || view;
        window.history.pushState({ view }, '', `/${currentUser.role}/${urlSegment}`);
    }

    // Close Mobile Sidebar
    if (window.innerWidth < 1024 && !document.getElementById('sidebar').classList.contains('-translate-x-full')) {
        toggleSidebar();
    }

    area.innerHTML = '';
    title.innerText = view.replace('-', ' ').toUpperCase();

    if (view === 'records') {
        currentSubjectView = null;
        currentRecordSearch = '';
        // Reset admin drill-down to the top-level teacher list
        if (typeof adminSelectedTeacher !== 'undefined') {
            adminSelectedTeacher = null;
            adminSelectedSection = null;
            adminTeacherSearch = '';
            adminSectionSearch = '';
        }
        // Reset adviser drill-down
        if (typeof adviserSelectedSection !== 'undefined') {
            adviserSelectedSection = null;
            adviserSearch = '';
        }
    }
    if (view === 'add-student') {
        addStudentSearch = '';
        addStudentSection = 'all';
    }

    try {
        switch (view) {
            case 'dashboard': renderDashboard(area); break;
            case 'add-student': renderAddStudent(area); break;
            case 'records': renderRecords(area); break;
            case 'adviser': renderAdviserRecords(area); break;
            case 'manage-teachers': renderManageTeachers(area); break;
            case 'subjects': renderSubjects(area); break;
            case 'assign-section': renderAssignSection(area); break;

            case 'logs': renderLogs(area); break;
            case 'settings': renderSettings(area); break;
            case 'maintenance': 
                if (typeof renderMaintenance === 'function') {
                    renderMaintenance(area);
                } else {
                    area.innerHTML = `<div class="p-8">Maintenance logic not loaded.</div>`;
                }
                break;
            case 'analytics':
                area.innerHTML = `
                    <div class="h-full flex flex-col items-center justify-center text-gray-500 p-8">
                        <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 border border-gray-100">
                            <i class="fas fa-chart-bar text-3xl text-gray-400"></i>
                        </div>
                        <h2 class="text-xl font-bold text-gray-900 mb-2">Analytics Dashboard</h2>
                        <p class="text-sm max-w-sm text-center">The analytics module is pending data integration.</p>
                    </div>
                `;
                break;
        }
    } catch (e) {
        console.error('View render failed:', e);
        area.innerHTML = `<div class="p-10 text-center flex flex-col items-center gap-4">
            <i class="fas fa-exclamation-triangle text-5xl text-red-100 mt-10"></i>
            <h3 class="text-xl font-bold text-red-500">Failed to load view</h3>
            <p class="text-sm text-gray-400">The <b>${view}</b> module encountered a fatal runtime error mapping records.</p>
            <p class="text-xs font-mono text-gray-400 bg-gray-50 p-2 rounded-lg">${e.message}</p>
        </div>`;
    }
}

// --- MASTER GRADES MODAL (For Admins/Advisers to override everything) ---
function openGradesModal(isAdviserMode = false) {
    const modal = document.getElementById('grades-modal');
    modal.classList.remove('hidden');
    modal.dataset.adviserMode = isAdviserMode ? 'true' : 'false';

    const secSelect = document.getElementById('grade-section-select');
    secSelect.innerHTML = '<option value="" disabled selected>-- Choose Section --</option>';

    if (isAdviserMode && adviserSelectedSection) {
        secSelect.add(new Option(adviserSelectedSection, adviserSelectedSection));
        secSelect.value = adviserSelectedSection;
        filterStudentsBySectionModal();
        secSelect.disabled = true;
    } else {
        const sections = [...new Set(students.map(s => s.section))].sort();
        sections.forEach(sec => secSelect.add(new Option(sec, sec)));
        secSelect.disabled = false;
        document.getElementById('grade-student-select').innerHTML = '<option value="" disabled selected>-- Choose Student --</option>';
        document.getElementById('grade-student-select').disabled = true;
    }

    const dynArea = document.getElementById('grades-form-body');
    if (!dynArea) return; // Guard against missing element if UI changed
    const visibleSubjects = (currentUser.role === 'admin' || isAdviserMode) ? coreSubjects : (currentUser.subject ? currentUser.subject.split(',').map(s => s.trim()) : []);

    dynArea.innerHTML = `
        <h4 class="text-[10px] font-bold text-primary uppercase mb-3 tracking-wider border-b border-green-200 pb-2">Final Subject Grades</h4>
        <div class="grid grid-cols-2 gap-3 mb-4">
            ${visibleSubjects.map(sub => `
                <div><label class="text-[10px] font-bold text-gray-500 uppercase block mb-1">${sub}</label><input type="number" id="grade-fin-${sub}" min="60" max="100" class="w-full px-2 py-1.5 border rounded outline-none focus:border-primary text-sm bg-white" oninput="calcOverallGWA()"></div>
            `).join('')}
        </div>
        <div class="grid grid-cols-2 gap-4 border-t border-green-200 pt-4">
            <div><label class="text-[10px] font-bold text-gray-500 uppercase block mb-1">Attendance %</label><input type="number" id="grade-att" min="0" max="100" class="w-full px-2 py-2 border rounded outline-none focus:border-primary text-sm bg-white font-bold" ${(currentUser.role === 'teacher' && !isAdviserMode) ? 'disabled title="Only Advisers/Admins can edit attendance"' : ''}></div>
            <div class="p-2 bg-white border border-gray-200 rounded-lg flex flex-col justify-center items-center shadow-inner">
                <span class="text-[10px] font-bold text-gray-400 uppercase">Overall GWA</span>
                <span class="text-xl font-bold text-primary" id="calc-display">--</span>
            </div>
        </div>
    `;
}

function closeGradesModal() { document.getElementById('grades-modal').classList.add('hidden'); }

function filterStudentsBySectionModal() {
    const section = document.getElementById('grade-section-select').value;
    const stuSelect = document.getElementById('grade-student-select');
    stuSelect.innerHTML = '<option value="" disabled selected>-- Choose Student --</option>';
    const filtered = students.filter(s => s.section === section).sort((a, b) => a.name.localeCompare(b.name));
    if (filtered.length > 0) {
        filtered.forEach(s => stuSelect.add(new Option(s.name, s.lrn)));
        stuSelect.disabled = false;
    } else {
        stuSelect.disabled = true;
    }
}

function populateMasterGradeForm() {
    const lrn = document.getElementById('grade-student-select').value;
    const s = students.find(x => x.lrn === lrn);
    if (!s) return;

    const isAdviserMode = document.getElementById('grades-modal').dataset.adviserMode === 'true';
    const visibleSubjects = (currentUser.role === 'admin' || isAdviserMode) ? coreSubjects : (currentUser.subject ? currentUser.subject.split(',').map(s => s.trim()) : []);

    visibleSubjects.forEach(sub => {
        const subData = s.subjects.find(x => x.n === sub);
        document.getElementById(`grade-fin-${sub}`).value = subData && subData.g ? subData.g : '';
    });
    document.getElementById('grade-att').value = s.attendance || '';
    calcOverallGWA();
}

function calcOverallGWA() {
    let total = 0; let count = 0;
    const isAdviserMode = document.getElementById('grades-modal').dataset.adviserMode === 'true';
    const visibleSubjects = (currentUser.role === 'admin' || isAdviserMode) ? coreSubjects : (currentUser.subject ? currentUser.subject.split(',').map(s => s.trim()) : []);

    visibleSubjects.forEach(sub => {
        const val = parseFloat(document.getElementById(`grade-fin-${sub}`).value);
        if (!isNaN(val)) { total += val; count++; }
    });
    const display = document.getElementById('calc-display');
    display.innerText = count > 0 ? (total / count).toFixed(2) : '--';
}

function saveMasterGrades(e) {
    e.preventDefault();
    const lrn = document.getElementById('grade-student-select').value;
    if (!lrn) return showMessage("Select a student first.", true);
    const s = students.find(x => x.lrn === lrn);
    if (!s) return;

    const isAdviserMode = document.getElementById('grades-modal').dataset.adviserMode === 'true';
    const visibleSubjects = (currentUser.role === 'admin' || isAdviserMode) ? coreSubjects : (currentUser.subject ? currentUser.subject.split(',').map(s => s.trim()) : []);

    visibleSubjects.forEach(sub => {
        const g = parseFloat(document.getElementById(`grade-fin-${sub}`).value);
        let subObj = s.subjects.find(x => x.n === sub);
        if (!isNaN(g)) {
            if (subObj) { subObj.g = g; }
            else { s.subjects.push({ n: sub, g: g }); }

            // Explicitly set the quarter when saving via Master Overlay
            let currentQ = window.currentRecordQuarter || 1;
            let finalSubObj = s.subjects.find(x => x.n === sub);
            if (finalSubObj) {
                finalSubObj.quarter = currentQ;
            }
        }
    });

    if (currentUser.role === 'admin' || isAdviserMode) {
        s.attendance = parseFloat(document.getElementById('grade-att').value) || s.attendance;
    }
    computeStudentGWA(s);
    logActivity(`Encoded master grades for ${s.name}`);

    // Persist each subject grade to DB
    const savePromises = visibleSubjects.map(sub => {
        const subObj = s.subjects.find(x => x.n === sub);
        if (!subObj || subObj.g === undefined) return Promise.resolve();
        const scores = {};
        for (let i = 1; i <= MAX_WW; i++) scores['ww' + i] = subObj['ww' + i] ?? null;
        for (let i = 1; i <= MAX_PT; i++) scores['pt' + i] = subObj['pt' + i] ?? null;
        scores.qa = subObj.qa ?? null;
        return fetch('/api/grades/save-bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ lrn, subject: sub, scores, grade: subObj.g ?? null, gwa: s.gwa ?? null, quarter: window.currentRecordQuarter || 1, school_year: window.currentRecordSchoolYear || '2025-2026' })
        }).catch(() => { });
    });
    Promise.all(savePromises); // fire & forget

    showMessage("Master Evaluation Saved Successfully!");
    closeGradesModal();
    if (isAdviserMode) {
        renderAdviserRecords(document.getElementById('content-area'));
    } else {
        renderRecords(document.getElementById('content-area'));
    }
}

// --- AI SCANNER ---
function openScanner(mode) {
    currentMode = mode;
    document.getElementById('camera-modal').classList.remove('hidden');

    let title = mode === 'STUDENT_LIST' ? 'AI Student Registration' : (mode === 'ATTENDANCE' ? 'AI Attendance Scanner' : 'AI Grade Extraction');
    document.getElementById('camera-title').innerText = title;

    document.getElementById('doc-upload').value = '';
    document.getElementById('doc-preview').classList.add('hidden');
    document.getElementById('doc-placeholder').classList.remove('hidden');
    document.getElementById('process-btn').disabled = true;
    document.getElementById('processing-status').classList.add('hidden');

    let hint = mode === 'STUDENT_LIST' ? 'Upload Class List Image' : (mode === 'ATTENDANCE' ? 'Upload DepEd SF2 Attendance Record' : 'Upload Overall Class Record');
    if (mode === 'CLASS_RECORD' && currentSubjectView) hint = `Upload ${currentSubjectView} Details Record`;
    document.getElementById('camera-hint').innerText = hint;
}

function closeCameraModal() { document.getElementById('camera-modal').classList.add('hidden'); }

let excelFile = null;

function handleDocPreview(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const ext = file.name.split('.').pop().toLowerCase();
        
        if (ext === 'xlsx' || ext === 'xls') {
            excelFile = file;
            base64Image = null;
            document.getElementById('doc-preview').src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzODQgNTEyIj48cGF0aCBmaWxsPSIjMTA3YzQxIiBkPSJNNjQgMEMyOC43IDAgMCAyOC43IDAgNjRWNDQ4YzAgMzUuMyAyOC43IDY0IDY0IDY0SDMyMGMzNS4zIDAgNjQtMjguNyA2NC02NFYxNjBIMjU2Yy0xNy43IDAtMzItMTQuMy0zMi0zMlYwSDY0eiIvPjxwYXRoIGZpbGw9IiNmZmZmZmYiIGQ9Ik0xNTIuMSAxOTkuMWwyMy41IDU5LjkgMjMuOS01OS45aDM0LjZsLTQxLjUgODYuOCA0NC41IDk0LjJoLTM1LjNsLTI2LjYtNjcuOS0yNy40IDY3LjloLTM0LjlsNDMuOC05My41LTQwLTg3LjVoMzUuNHoiLz48cGF0aCBmaWxsPSIjMTg1YzM3IiBkPSJNMjU2IDBWMTI4YzAgMTcuNyAxNC4zIDMyIDMyIDMySDM4NEwyNTYgMHoiLz48L3N2Zz4=';
            document.getElementById('doc-preview').classList.remove('hidden');
            document.getElementById('doc-placeholder').classList.add('hidden');
            document.getElementById('process-btn').disabled = false;
            return;
        }

        excelFile = null;
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const cvs = document.getElementById('canvas-tool');
                const ctx = cvs.getContext('2d');
                const SCALE = 1024;
                let w = img.width, h = img.height;
                if (w > h) { if (w > SCALE) { h *= SCALE / w; w = SCALE; } }
                else { if (h > SCALE) { w *= SCALE / h; h = SCALE; } }
                cvs.width = w; cvs.height = h;
                ctx.drawImage(img, 0, 0, w, h);
                base64Image = cvs.toDataURL('image/jpeg', 0.8);
                document.getElementById('doc-preview').src = base64Image;
                document.getElementById('doc-preview').classList.remove('hidden');
                document.getElementById('doc-placeholder').classList.add('hidden');
                document.getElementById('process-btn').disabled = false;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function processAI() {
    document.getElementById('process-btn').disabled = true;
    document.getElementById('processing-status').classList.remove('hidden');

    let prompt = "";
    const subjectScope = currentUser.role === 'teacher' ? `for ${currentUser.subject} only` : `for all subjects (${coreSubjects.join(', ')})`;

    const sampleStudent = students && students.length ? (students.find(s => s.section) || students[0]) : null;
    const secStr = sampleStudent && sampleStudent.section ? sampleStudent.section.toLowerCase() : '';
    const isSHS = secStr.includes('grade 11') || secStr.includes('grade 12') || secStr.includes('gr 11') || secStr.includes('gr 12') || window.studentsAnalyticsLevel === 'SH';

    if (currentMode === 'STUDENT_LIST') {
        prompt = "Extract student names from this list. Format as JSON array of objects: {name: 'Last, First M.', lrn: 'unique_random_8_digits', section: 'Detected'}. For section, ONLY extract it if it's explicitly a class block or grade level (e.g., 'Grade 10-Einstein' or 'ICT 12'). Do NOT use subject names like 'Business Math' or 'Business Ethics' as the section. If you can't find a valid section name, leave section as null.";
    } else if (currentMode === 'CLASS_RECORD' && currentSubjectView) {
        let wwFormat = [];
        let ptFormat = [];
        for(let i=1; i<=MAX_WW; i++) wwFormat.push('ww'+i);
        for(let i=1; i<=MAX_PT; i++) ptFormat.push('pt'+i);
        
        let formatStr = `{name: 'Student Name', ${wwFormat.map(k=>`${k}: number`).join(', ')}, ${ptFormat.map(k=>`${k}: number`).join(', ')}, qa: number}`;
        let termStr = isSHS ? "using the 3-Term (Trimester) format" : "using the 4-Quarter format";
        prompt = `Extract student names and their ${currentSubjectView} breakdown scores ${termStr}: Quiz 1-${MAX_WW} (${wwFormat.join(', ')}), Task 1-${MAX_PT} (${ptFormat.join(', ')}), Exam (qa). IMPORTANT: Also extract the row for maximum possible scores (often labeled 'Highest Possible Score') and include it in the array exactly like a student, but strictly name it 'HIGHEST POSSIBLE SCORE'. Format as JSON array: ${formatStr}`;
    } else if (currentMode === 'ATTENDANCE') {
        prompt = `Extract student names and their daily attendance marks for 25 columns (5 weeks of Monday-Friday). Return "/" for present, "x" for absent, or "" if blank. Format as JSON array of objects: {name: 'Student Name', marks: ["/", "x", ...]} (exactly 25 strings in marks array). Look for a grid layout with M-T-W-T-F headers.`;
    } else {
        prompt = `Extract student names, their individual subject grades ${subjectScope}, and ATTENDANCE from this class record image. Format as JSON array: {name: 'Student Name', subjects: [{n:'Math', g:90}, ...], attendance: number}`;
    }

    try {
        let data = [];

        let resText = "";

        if (excelFile) {
            const arrayBuffer = await excelFile.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            
            let targetSheetName = workbook.SheetNames[0];
            const targetQuarter = window.currentRecordQuarter || 1;
            
            const qStr1 = isSHS ? `T${targetQuarter}` : `Q${targetQuarter}`;
            const qStr2 = isSHS ? `TERM ${targetQuarter}` : `QUARTER ${targetQuarter}`;
            for (let name of workbook.SheetNames) {
                if (name.toUpperCase().includes(qStr1) || name.toUpperCase().includes(qStr2)) {
                    targetSheetName = name;
                    break;
                }
            }
            
            const worksheet = workbook.Sheets[targetSheetName];
            const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            const cleaned = rawJson.filter(row => row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''));
            const dataString = JSON.stringify(cleaned);
            
            const excelPrompt = prompt + `\n\nHere is the data extracted from the sheet '${targetSheetName}' of the uploaded Excel file. You are extracting scores for ${isSHS ? 'Term' : 'Quarter'} ${targetQuarter}. Please carefully analyze the data and extract the scores according to the format instructions above:\n\n` + dataString;
            
            resText = await callGemini(excelPrompt, null);
        } else {
            resText = await callGemini(prompt, base64Image);
        }
        
        if (resText.startsWith("Error:")) throw new Error(resText);
        
        // Robust JSON extraction
        let cleanRes = resText.replace(/```json|```/gi, '').trim();
        const startIdx = cleanRes.indexOf('[');
        const endIdx = cleanRes.lastIndexOf(']');
        if (startIdx !== -1 && endIdx !== -1) {
            cleanRes = cleanRes.substring(startIdx, endIdx + 1);
        }
        
        data = JSON.parse(cleanRes);

        const getClean = str => (str || '').toLowerCase().replace(/[^a-z]/g, '');
        const findStudentMatch = (itemName) => {
            if (!itemName) return null;
            const parts = itemName.split(',');
            const lastName = getClean(parts[0]);
            const firstName = getClean(parts[1]);
            const matchingLast = students.filter(x => getClean(x.name.split(',')[0]) === lastName);
            if (matchingLast.length === 1) return matchingLast[0];
            if (matchingLast.length > 1) {
                return matchingLast.find(x => {
                    const xFirst = getClean(x.name.split(',')[1]);
                    return xFirst.includes(firstName) || firstName.includes(xFirst);
                }) || matchingLast[0];
            }
            const rawName = getClean(itemName);
            return students.find(x => getClean(x.name).includes(rawName) || rawName.includes(getClean(x.name)));
        };

        if (currentMode === 'STUDENT_LIST') {
            await Promise.all(data.map(async x => {
                students.push({ ...x, gwa: 0, attendance: 0, subjects: [] });
                try {
                    await fetch('/api/students', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        body: JSON.stringify({ lrn: x.lrn, name: x.name, section: x.section || null, adviser: 'Pending Assignment' })
                    });
                } catch (e) { }
            }));
            logActivity(`AI registered ${data.length} new students via list scan.`);
            showMessage(`AI detected and added ${data.length} student profiles.`);
            navigate('add-student');
        } else if (currentMode === 'CLASS_RECORD' && currentSubjectView) {
            let count = 0;
            const savePromises = [];
            data.forEach(item => {
                if (item.name && item.name.toUpperCase().includes('HIGHEST POSSIBLE SCORE')) {
                    const key = `${currentSubjectView}_Q${window.currentRecordQuarter || 1}`;
                    if (!maxScores[key]) maxScores[key] = {};
                    for (let i = 1; i <= MAX_WW; i++) {
                        const keyMatch = Object.keys(item).find(k => k.toLowerCase() === 'ww' + i);
                        if (keyMatch && item[keyMatch] !== undefined && item[keyMatch] !== null && String(item[keyMatch]).trim() !== '') maxScores[key]['ww' + i] = parseFloat(item[keyMatch]);
                    }
                    for (let i = 1; i <= MAX_PT; i++) {
                        const keyMatch = Object.keys(item).find(k => k.toLowerCase() === 'pt' + i);
                        if (keyMatch && item[keyMatch] !== undefined && item[keyMatch] !== null && String(item[keyMatch]).trim() !== '') maxScores[key]['pt' + i] = parseFloat(item[keyMatch]);
                    }
                    const qaMatch = Object.keys(item).find(k => k.toLowerCase() === 'qa');
                    if (qaMatch && item[qaMatch] !== undefined && item[qaMatch] !== null && String(item[qaMatch]).trim() !== '') maxScores[key].qa = parseFloat(item[qaMatch]);
                    
                    if (typeof saveMaxScores === 'function') {
                        saveMaxScores();
                        students.forEach(st => { 
                            if(typeof recalcStudentSubject === 'function') recalcStudentSubject(st, currentSubjectView); 
                            if(typeof computeStudentGWA === 'function') computeStudentGWA(st); 
                        });
                    }
                    return; // Stop here for max score row
                }
                const s = findStudentMatch(item.name);
                if (s) {
                    let subObj = s.subjects.find(x => x.n === currentSubjectView);
                    if (!subObj) { subObj = { n: currentSubjectView }; s.subjects.push(subObj); }

                    for (let i = 1; i <= MAX_WW; i++) {
                        const keyMatch = Object.keys(item).find(k => k.toLowerCase() === 'ww' + i);
                        if (keyMatch && item[keyMatch] !== undefined && item[keyMatch] !== null && String(item[keyMatch]).trim() !== '') subObj['ww' + i] = item[keyMatch];
                    }
                    for (let i = 1; i <= MAX_PT; i++) {
                        const keyMatch = Object.keys(item).find(k => k.toLowerCase() === 'pt' + i);
                        if (keyMatch && item[keyMatch] !== undefined && item[keyMatch] !== null && String(item[keyMatch]).trim() !== '') subObj['pt' + i] = item[keyMatch];
                    }
                    const qaMatch = Object.keys(item).find(k => k.toLowerCase() === 'qa');
                    if (qaMatch && item[qaMatch] !== undefined && item[qaMatch] !== null && String(item[qaMatch]).trim() !== '') subObj.qa = item[qaMatch];

                    recalcStudentSubject(s, currentSubjectView);
                    computeStudentGWA(s);
                    count++;

                    const scores = {};
                    for (let i = 1; i <= MAX_WW; i++) scores['ww' + i] = subObj['ww' + i] ?? null;
                    for (let i = 1; i <= MAX_PT; i++) scores['pt' + i] = subObj['pt' + i] ?? null;
                    scores.qa = subObj.qa ?? null;

                    savePromises.push(
                        fetch('/api/grades/save-bulk', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                            body: JSON.stringify({ lrn: s.lrn, subject: currentSubjectView, scores, grade: subObj.g ?? null, gwa: s.gwa ?? null, quarter: window.currentRecordQuarter || 1, school_year: window.currentRecordSchoolYear || '2025-2026' })
                        }).catch(() => { })
                    );
                }
            });
            await Promise.all(savePromises);

            logActivity(`AI extracted ${currentSubjectView} detailed raw grades for ${count} students.`);
            showMessage(`AI updated detailed raw records for ${count} students in ${currentSubjectView}.`);
            renderRecords(document.getElementById('content-area'));
        } else if (currentMode === 'ATTENDANCE') {
            let count = 0;
            data.forEach(item => {
                const s = findStudentMatch(item.name);
                if (s && item.marks && Array.isArray(item.marks)) {
                    item.marks.slice(0, 25).forEach((m, i) => {
                        const input = document.querySelector(`input[data-lrn="${s.lrn}"][data-idx="${i}"]`);
                        if (input) {
                            input.value = (m === '/' || m === 'x') ? m : '';
                            if (m === 'x') input.classList.add('text-red-500');
                            else input.classList.remove('text-red-500');
                        }
                    });
                    updateStudentAttendanceRow(s.lrn);
                    count++;
                }
            });
            showMessage(`AI extracted detailed daily attendance for ${count} students.`);
        } else {
            let count = 0;
            const savePromises = [];
            data.forEach(item => {
                const s = findStudentMatch(item.name);
                if (s) {
                    if (item.subjects) {
                        item.subjects.forEach(newSub => {
                            let subObj = s.subjects.find(x => x.n === newSub.n);
                            if (subObj) subObj.g = newSub.g;
                            else {
                                subObj = { n: newSub.n, g: newSub.g };
                                s.subjects.push(subObj);
                            }

                            savePromises.push(
                                fetch('/api/grades/save-bulk', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                                    body: JSON.stringify({ lrn: s.lrn, subject: newSub.n, scores: {}, grade: subObj.g ?? null, gwa: s.gwa ?? null, quarter: window.currentRecordQuarter || 1, school_year: window.currentRecordSchoolYear || '2025-2026' })
                                }).catch(() => { })
                            );
                        });
                    }
                    s.attendance = item.attendance || s.attendance;
                    computeStudentGWA(s);
                    count++;
                }
            });
            await Promise.all(savePromises);

            logActivity(`AI extracted master grades for ${count} students.`);
            showMessage(`AI extracted master records for ${count} students.`);
            renderRecords(document.getElementById('content-area'));
        }
        closeCameraModal();
    } catch (e) {
        console.error(e);
        showMessage("AI failed to read document or API connection failed. Check console.", true);
        document.getElementById('process-btn').disabled = false;
        document.getElementById('processing-status').classList.add('hidden');
    }
}

// --- STUDENT QR VIEWER ---
let html5QrCode;

function startCameraScanner() {
    document.getElementById('qr-entry-zone').classList.add('hidden');
    document.getElementById('qr-reader').classList.remove('hidden');
    document.getElementById('stop-scan-btn').classList.remove('hidden');

    // Delay initialization slightly to ensure element has dimensions
    setTimeout(() => {
        if (html5QrCode) {
            html5QrCode.stop().catch(() => { }).finally(() => {
                initStudentScanner();
            });
        } else {
            initStudentScanner();
        }
    }, 100);

    function initStudentScanner() {
        const overlay = document.getElementById('qr-scan-overlay');
        if (overlay) overlay.classList.remove('hidden');
        html5QrCode = new Html5Qrcode("qr-reader");
        html5QrCode.start(
            { facingMode: "environment" },
            { fps: 15, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
                stopCameraScanner();
                handleScannedLRN(decodedText);
            },
            (errorMessage) => { }
        ).catch((err) => {
            console.error("Student Scanner Error:", err);
            if (typeof showMessage === 'function') showMessage("Camera access denied or error: " + err.message, true);
            else alert("Camera access denied.");
            stopCameraScanner();
        });
    }
}

function stopCameraScanner() {
    if (html5QrCode) {
        try {
            // Store reference locally to allow immediate nullification avoiding race conditions
            const scannerRef = html5QrCode;
            html5QrCode = null;

            scannerRef.stop().then(() => {
                scannerRef.clear();
            }).catch(err => console.log("Stop scanner promise error:", err));
        } catch (e) {
            console.log("Sync error stopping scanner:", e);
        }
    }

    let qrReader = document.getElementById('qr-reader');
    let qrEntryZone = document.getElementById('qr-entry-zone');
    let stopBtn = document.getElementById('stop-scan-btn');

    if (qrReader) qrReader.classList.add('hidden');
    if (document.getElementById('qr-scan-overlay')) document.getElementById('qr-scan-overlay').classList.add('hidden');
    if (qrEntryZone) qrEntryZone.classList.remove('hidden');
    if (stopBtn) stopBtn.classList.add('hidden');
}

function triggerQrFile() {
    stopCameraScanner();
    document.getElementById('qr-input').click();
}

function handleQrScan(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        document.getElementById('qr-loading').classList.remove('hidden');

        const fileQrCode = new Html5Qrcode("qr-reader");
        fileQrCode.scanFile(file, true)
            .then(decodedText => {
                document.getElementById('qr-loading').classList.add('hidden');
                handleScannedLRN(decodedText);
            })
            .catch(err => {
                document.getElementById('qr-loading').classList.add('hidden');
                showMessage("Could not detect a QR Code in the image.", true);
            });

        input.value = '';
    }
}

async function handleScannedLRN(lrn) {
    if (!lrn) return;

    // 1. Immediately close the scanner modal
    const scannerModal = document.getElementById('qr-scan-modal');
    if (scannerModal) scannerModal.classList.add('hidden');
    stopCameraScanner();

    // 2. Determine Context: Are we logging in or scanning a student as Staff?
    const isLoginPage = window.location.pathname.includes('/login/student');

    try {
        const res = await fetch('/api/students/login-by-lrn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ lrn: lrn })
        });
        const data = await res.json();

        if (data.requires_pin) {
            // Need PIN verification
            if (typeof openStudentPinModal === 'function') {
                pendingLrn = lrn;
                openStudentPinModal();
            } else {
                // Modal not present (unexpected on student login page)
                if (isLoginPage) alert("PIN verification required but modal not loaded.");
                else await showQuickGrades(lrn);
            }
        } else if (res.ok) {
            // Successful identity check
            if (isLoginPage) {
                // Redirect to dashboard synchronously for students
                if (typeof completeStudentLogin === 'function') completeStudentLogin(data);
                else {
                    sessionStorage.setItem('cnhs_student_session', JSON.stringify(data));
                    window.location.href = '/student/dashboard';
                }
            } else {
                // Show Quick Grades for Staff
                await showQuickGrades(lrn);
            }
        } else {
            const errorMsg = data.error || "Student not found";
            if (typeof showMessage === 'function') showMessage(errorMsg, true);
            else alert(errorMsg);
        }
    } catch (e) {
        console.error(e);
        if (!isLoginPage) await showQuickGrades(lrn);
    }
}

// ─── INSTANT GRADES VIEW (Auth OR Login) ─────────────────────────────────
async function showQuickGrades(lrn) {
    if (!lrn) return;
    lrn = lrn.trim();

    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance("Thank you");
        msg.rate = 1.0;
        window.speechSynthesis.speak(msg);
    }

    // Build or get modal container FIRST to show immediate loading state
    let modal = document.getElementById('quick-grades-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'quick-grades-modal';
        modal.className = 'fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-10 animate-scale-up relative flex flex-col items-center justify-center text-center">
            <button onclick="document.getElementById('quick-grades-modal').remove()" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-200 hover:text-gray-600 flex items-center justify-center transition focus:outline-none">
                <i class="ph ph-x"></i>
            </button>
            <div class="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6 drop-shadow-md"></div>
            <h3 class="text-xl font-black text-gray-900 mb-2">Processing Scan</h3>
            <p class="text-sm text-gray-500 leading-relaxed">Retrieving records for<br><span class="font-mono font-bold text-primary mt-1 inline-block px-3 py-1 bg-primary/10 rounded-lg">${lrn}</span></p>
        </div>
    `;

    try {
        // Fetch fresh data for this specific student after UI shows loading
        const res = await fetch(`/api/students/${lrn}/subjects?with_name=1`, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) {
            modal.innerHTML = `
                <div class="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-10 animate-scale-up relative flex flex-col items-center justify-center text-center">
                    <button onclick="document.getElementById('quick-grades-modal').remove()" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-200 hover:text-gray-600 flex items-center justify-center transition focus:outline-none"><i class="ph ph-x"></i></button>
                    <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-3xl mb-6 shadow-inner border border-red-100"><i class="ph ph-warning"></i></div>
                    <h3 class="text-xl font-black text-gray-900 mb-2">Profile Not Found</h3>
                    <p class="text-sm text-gray-500">Could not find any records matching<br><span class="font-mono font-bold text-gray-700 mt-1 inline-block">${lrn}</span></p>
                </div>
            `;
            return;
        }
        const data = await res.json();

        window.quickGradesStudentInfo = {
            name: data.student_name || lrn,
            section: data.section || '',
            history: data.enrollment_history || []
        };

        // Group by school year natively to show full history
        const grouped = {};
        const subsList = Array.isArray(data.subjects) ? data.subjects : Object.values(data.subjects || {});
        subsList.forEach(sub => {
            const sy = sub.school_year || 'Unknown S.Y.';
            if (!grouped[sy]) grouped[sy] = [];
            grouped[sy].push(sub);
        });

        window.quickGradesData = grouped;
        const sortedSY = Object.keys(grouped).sort().reverse();

        if (sortedSY.length === 0) {
            modal.innerHTML = `
                <div class="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg p-8 animate-scale-up relative">
                    <button onclick="document.getElementById('quick-grades-modal').remove()" class="absolute top-6 right-6 w-10 h-10 rounded-full bg-gray-50 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition border border-gray-100 z-10"><i class="fas fa-times"></i></button>
                    <div class="flex items-center gap-5 mb-8 shrink-0 pr-12">
                        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-green-700 flex items-center justify-center text-white text-2xl shadow-lg shadow-primary/30">
                            <i class="fas fa-user-graduate"></i>
                        </div>
                        <div>
                            <h3 class="text-2xl font-black text-gray-900 leading-tight">${data.student_name || lrn}</h3>
                            <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Academic Transcript</p>
                        </div>
                    </div>
                    <div class="p-8 text-center text-gray-400 italic bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">No historical records found for this LRN.</div>
                </div>`;
            return;
        }

        const defaultSY = sortedSY[0];

        let optionsHtml = '';
        sortedSY.forEach(sy => {
            optionsHtml += `<option value="${sy}">S.Y. ${sy}</option>`;
        });

        modal.innerHTML = `
            <div class="bg-white rounded-[1rem] shadow-2xl w-full max-w-3xl p-6 md:p-8 animate-scale-up relative max-h-[95vh] flex flex-col">
                <button onclick="document.getElementById('quick-grades-modal').remove()" class="absolute top-4 right-4 w-8 h-8 rounded-full flex justify-center items-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors z-20"><i class="ph ph-x"></i></button>

                <!-- Header Section -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 pb-4 border-b border-gray-200 shrink-0 gap-4">
                    <div>
                        <h2 class="text-xl font-black text-primary uppercase tracking-tight">${data.student_name || lrn}</h2>
                        <p id="quick-grades-subtitle" class="text-xs font-bold text-gray-500 uppercase tracking-widest mt-0.5">Academic Transcript</p>
                    </div>
                    
                    <div class="w-full md:w-auto min-w-[180px]">
                        <label class="block text-[10px] font-bold text-primary uppercase tracking-widest mb-1">School Year</label>
                        <div class="relative items-center">
                            <select onchange="window.renderQuickGradesTable(this.value)" class="w-full bg-transparent border-b-2 border-primary text-gray-800 font-bold text-sm py-1.5 pr-6 focus:outline-none appearance-none cursor-pointer">
                                ${optionsHtml}
                            </select>
                            <i class="ph ph-caret-down absolute right-1 top-1/2 -translate-y-1/2 text-primary text-xs pointer-events-none"></i>
                        </div>
                    </div>
                </div>

                <!-- Table Container -->
                <div class="overflow-y-auto custom-scrollbar flex-1 relative px-0.5 pb-2">
                    <div id="quick-grades-container">
                        <!-- Injected dynamically -->
                    </div>
                </div>
            </div>
        `;

        window.renderQuickGradesTable(defaultSY);
    } catch (e) {
        console.error("Quick Grades Error:", e);
        showMessage('Error fetching student grades: ' + e.message, true);
    }
}

window.renderQuickGradesTable = function (sy) {
    const container = document.getElementById('quick-grades-container');
    if (!container || !window.quickGradesData) return;

    // Update subtitle with Section and Year Level
    let sectionStr = '';
    let yearLevelStr = '';
    const info = window.quickGradesStudentInfo;

    if (info) {
        if (info.history && Array.isArray(info.history)) {
            const histItem = info.history.find(h => h.school_year === sy);
            if (histItem && histItem.section) sectionStr = histItem.section;
        }
        if (!sectionStr && info.section) sectionStr = info.section;

        if (sectionStr) {
            try {
                const rawSec = localStorage.getItem('cnhs_sections');
                if (rawSec) {
                    const parsedSec = JSON.parse(rawSec);
                    const matchedSec = parsedSec.find(s => s.name === sectionStr);
                    if (matchedSec && matchedSec.year) yearLevelStr = matchedSec.year;
                }
            } catch (e) { }
        }
    }

    const subtitleEl = document.getElementById('quick-grades-subtitle');
    if (subtitleEl) {
        let subtitleText = 'Academic Transcript';
        if (sectionStr) {
            subtitleText = 'Section: ' + sectionStr;
            if (yearLevelStr) subtitleText += ' • Year Level: ' + yearLevelStr;
        }
        subtitleEl.textContent = subtitleText;
    }

    const subjects = window.quickGradesData[sy] || [];
    let html = '';

    if (subjects.length === 0) {
        html = `<div class="p-8 text-center text-gray-400 italic bg-gray-50 rounded-xl border border-gray-200">No enrolled subjects found for S.Y.${sy}.</div>`;
    } else {
        // Group by subject name
        const bySubject = {};
        subjects.forEach(sub => {
            const name = sub.subject_name || sub.n || 'Unknown';
            if (!bySubject[name]) bySubject[name] = [];
            bySubject[name].push(sub);
        });

        let rowsHtml = '';
        let totalGeneralGrade = 0;
        let subjectsWithFinal = 0;

        const isSHS = yearLevelStr.includes('11') || yearLevelStr.includes('12') || window.studentsAnalyticsLevel === 'SH';
        const maxTerms = isSHS ? 3 : 4;

        // Iterate subjects exactly like a traditional transcript
        Object.keys(bySubject).forEach(subName => {
            const subs = bySubject[subName];

            let q1 = '-', q2 = '-', q3 = '-', q4 = '-', finalStr = '-';
            let sum = 0, count = 0;

            const updateQ = (qNum, val) => {
                if (val !== null && val !== undefined && val !== '') {
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                        sum += num;
                        count++;
                    }
                    return val;
                }
                return '-';
            };

            const s1 = subs.find(s => (s.quarter || 1) == 1); q1 = updateQ(1, s1 ? (s1.grade || s1.g) : null);
            const s2 = subs.find(s => (s.quarter || 1) == 2); q2 = updateQ(2, s2 ? (s2.grade || s2.g) : null);
            const s3 = subs.find(s => (s.quarter || 1) == 3); q3 = updateQ(3, s3 ? (s3.grade || s3.g) : null);
            if (!isSHS) {
                const s4 = subs.find(s => (s.quarter || 1) == 4); q4 = updateQ(4, s4 ? (s4.grade || s4.g) : null);
            }

            if (count === maxTerms) {
                // Typical DepEd academic averaging uses round instead of formatting exactly 2 decimal places
                const finalGrade = Math.round(sum / maxTerms);
                finalStr = finalGrade;
                totalGeneralGrade += finalGrade;
                subjectsWithFinal++;
            }

            rowsHtml += `
                <tr class="hover:bg-primary/5 transition-colors border-b border-gray-200">
                    <td class="border-x border-gray-300 px-4 py-3 text-sm text-gray-800 font-medium">${subName}</td>
                    <td class="border-r border-gray-300 px-2 py-3 text-center text-[13px] text-gray-900 font-bold">${q1 !== '-' ? q1 : ''}</td>
                    <td class="border-r border-gray-300 px-2 py-3 text-center text-[13px] text-gray-900 font-bold">${q2 !== '-' ? q2 : ''}</td>
                    <td class="border-r border-gray-300 px-2 py-3 text-center text-[13px] text-gray-900 font-bold">${q3 !== '-' ? q3 : ''}</td>
                    ${!isSHS ? `<td class="border-r border-gray-300 px-2 py-3 text-center text-[13px] text-gray-900 font-bold">${q4 !== '-' ? q4 : ''}</td>` : ''}
                    <td class="border-r border-gray-300 px-2 py-3 text-center text-[14px] font-black text-primary bg-primary/5">${finalStr !== '-' ? finalStr : ''}</td>
                </tr>
                `;
        });

        let gwaHtml = '';
        // If they have all quarters completed, calculate General Average
        if (subjectsWithFinal > 0 && subjectsWithFinal === Object.keys(bySubject).length) {
            const gwa = Math.round(totalGeneralGrade / subjectsWithFinal);
            const gwaColor = gwa >= 75 ? 'text-green-700' : 'text-red-600';
            gwaHtml = `
                <tr class="bg-gray-50/80">
                    <td colspan="${isSHS ? 4 : 5}" class="border border-gray-300 px-4 py-4 text-xs font-black uppercase text-gray-800 tracking-wider text-left">General Average for the Academic Year</td>
                    <td class="border border-gray-300 px-2 py-4 text-center text-lg font-black ${gwaColor} bg-gray-100">${gwa}</td>
                </tr>
                `;
        }

        html = `
                <div class="rounded-2xl border border-gray-200 overflow-hidden w-full bg-white shadow-lg mt-6 overflow-x-auto">
                    <table class="w-full border-collapse border-hidden">
                        <thead>
                            <tr class="bg-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] leading-tight border-b border-gray-100">
                                <th class="px-6 py-5 text-left font-black">Learning Areas</th>
                                <th class="px-3 py-5 text-center w-[10%]">${isSHS ? 'T1' : 'Q1'}</th>
                                <th class="px-3 py-5 text-center w-[10%]">${isSHS ? 'T2' : 'Q2'}</th>
                                <th class="px-3 py-5 text-center w-[10%]">${isSHS ? 'T3' : 'Q3'}</th>
                                ${!isSHS ? `<th class="px-3 py-5 text-center w-[10%]">Q4</th>` : ''}
                                <th class="px-3 py-5 text-center w-[15%] bg-blue-50/50 text-blue-900">Final</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-50">
                            ${rowsHtml}
                            ${gwaHtml}
                        </tbody>
                    </table>
                </div>
                <div class="mt-8 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-4">
                    <div class="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xl shrink-0">
                        <i class="ph ph-check-circle"></i>
                    </div>
                    <div>
                        <p class="text-xs font-black text-emerald-900 uppercase tracking-widest leading-none mb-1">Authenticated</p>
                        <p class="text-[10px] text-emerald-600 font-medium">This record is verified by CNHS AI Evaluation System</p>
                    </div>
                </div>
                `;
    }
    container.innerHTML = html;
}


// --- ACADEMIC REPORT (QR Scan) ---
// Current student being viewed in the report
let _reportStudent = null;

async function showReport(s) {
    if (!s) return;
    _reportStudent = s;
    const modal = document.getElementById('report-modal');
    const content = document.getElementById('report-content');
    if (!modal || !content) return;

    modal.setAttribute('data-lrn', s.lrn);
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // prevent bg scroll

    // ── Auto-detect Year Level based on sections ──
    const subjectToYearLevel = {
        'AP 7': ['Grade 7'], 'MAPEH 7': ['Grade 7'], 'English 7': ['Grade 7'],
        'Science 8': ['Grade 8'], 'Math 8': ['Grade 8'],
        'Filipino 9': ['Grade 9'], 'TLE 9': ['Grade 9'],
        'Math 10': ['Grade 10'], 'Science 10': ['Grade 10'],
        'General Mathematics': ['Grade 11'], 'Oral Communication': ['Grade 11'],
        'Business Finance': ['Grade 12'], 'Practical Research 2': ['Grade 12']
    };

    let guessedYear = '';
    // Basic heuristics from section name
    if (s.section) {
        const sec = s.section.toLowerCase();
        if (sec.includes('7')) guessedYear = 'Grade 7';
        else if (sec.includes('8')) guessedYear = 'Grade 8';
        else if (sec.includes('9')) guessedYear = 'Grade 9';
        else if (sec.includes('10')) guessedYear = 'Grade 10';
        else if (sec.includes('11')) guessedYear = 'Grade 11';
        else if (sec.includes('12')) guessedYear = 'Grade 12';
        
        // Fallback: Check adviser
        if (!guessedYear && typeof teachers !== 'undefined') {
            const adv = teachers.find(t => t.is_adviser && (t.section || '').split(',').map(x => x.trim().toLowerCase()).includes(sec));
            if (adv) {
                if (adv.level === 'SH') guessedYear = 'Grade 11';
                if (adv.level === 'JH') guessedYear = 'Grade 7';
            }
        }
    }

    // Refine with actual subjects if available
    const detectedYears = new Set();
    const allSubjectsInDB = s.subjects ? s.subjects.map(x => x.n) : [];
    allSubjectsInDB.forEach(subName => {
        const levels = subjectToYearLevel[subName];
        if (levels) levels.forEach(y => detectedYears.add(y));
    });

    const allYearLevels = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

    // If we confidently guessed the year based on Section, only show that exact year level.
    if (!guessedYear && detectedYears.size > 0) {
        let yearLevelsToShow = allYearLevels.filter(y => detectedYears.has(y));
        guessedYear = yearLevelsToShow[yearLevelsToShow.length - 1];
    }

    // ── Auto-detect strand from section name ──
    let guessedStrand = '';
    const SH_STRANDS = ['Academic', 'TechPro'];
    const secLower = (s.section || '').toLowerCase();
    for (const st of SH_STRANDS) {
        if (secLower.includes(st.toLowerCase())) { guessedStrand = st; break; }
    }

    // ── Sections dropdown ──
    // Only show the student's enrolled section
    const sectionOptions = s.section 
        ? `<option value="${s.section}" selected>${s.section}</option>`
        : `<option value="" selected>No Section Assigned</option>`;

    // Only show the student's enrolled year level and previous grades
    let activeYearsForStudent = new Set(detectedYears);
    if (guessedYear) activeYearsForStudent.add(guessedYear);
    
    let yearsToShow = allYearLevels.filter(y => activeYearsForStudent.has(y));
    let yearOptions = yearsToShow.map(y => 
        `<option value="${y}" ${y === guessedYear ? 'selected' : ''}>${y}</option>`
    ).join('');
    
    if (yearsToShow.length === 0) {
        yearOptions = `<option value="" selected disabled>Unknown Year Level</option>`;
    }

    const strandOpts = SH_STRANDS.map(st =>
        `<option value="${st}" ${st === guessedStrand ? 'selected' : ''}>${st}</option>`
    ).join('');

    const isSH = guessedYear === 'Grade 11' || guessedYear === 'Grade 12';

    // ── If only 1 year level detected, show a subtle badge instead of dropdown ──
    const noGradeNote = detectedYears.size === 0
        ? `<p class="text-[10px] text-yellow-600 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-1.5 mb-1"><i class="fas fa-info-circle mr-1"></i>No grades recorded yet.</p>`
        : '';

    // ── Generate School Year options dynamically based on exact history ──
    const activeYears = new Set();
    if (s.enrollment_history && Array.isArray(s.enrollment_history)) {
        s.enrollment_history.forEach(h => { if (h.school_year) activeYears.add(h.school_year); });
    }
    if (s.section) activeYears.add(window.currentRecordSchoolYear || '2024-2025');

    const sortedYears = [...activeYears].sort().reverse();
    if (sortedYears.length === 0) sortedYears.push(window.currentRecordSchoolYear || '2024-2025');

    const curYearSelect = window.currentRecordSchoolYear || sortedYears[0];
    const schoolYearOptions = sortedYears.map(sy =>
        `<option value="${sy}" ${sy === curYearSelect ? 'selected' : ''}>${sy}</option>`
    ).join('');

    content.innerHTML = `
        <div class="flex justify-between items-start pb-4 mb-5 border-b border-gray-100 relative">
            <div>
                <h3 class="text-xl font-bold text-gray-900">${s.name}</h3>
                <p class="text-xs text-gray-400 font-mono mt-0.5">LRN: ${s.lrn} | Section: ${s.section || '—'}</p>
            </div>
            <div id="qr-container-sel" class="p-1.5 border border-gray-200 rounded-lg bg-white ml-3 shrink-0"></div>
            <button onclick="closeReport()" class="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition flex items-center justify-center text-xs">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <div class="space-y-4 mb-6">
            ${noGradeNote}
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Year Level</label>
                    <select id="report-grade-level" onchange="onReportGradeChange(this.value)"
                        class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-primary bg-white cursor-pointer">
                        ${yearOptions}
                    </select>
                </div>
                <div>
                    <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">School Year</label>
                    <select id="report-school-year" onchange="onReportSchoolYearChange(this.value)"
                        class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-primary bg-white cursor-pointer">
                        ${schoolYearOptions}
                    </select>
                </div>
            </div>

            <!-- Strand (SH only) -->
            <div id="report-strand-wrap" class="${isSH ? '' : 'hidden'}">
                <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Strand / Track</label>
                <select id="report-strand" onchange="onReportStrandChange(this.value)"
                    class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-primary bg-white cursor-pointer">
                    ${strandOpts}
                </select>
            </div>

            <div>
                <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Section</label>
                <select id="report-section"
                    class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-primary bg-white cursor-pointer">
                    <option value="" disabled ${!s.section ? 'selected' : ''}>-- Select Section --</option>
                    ${sectionOptions}
                </select>
            </div>

            <div>
                <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Grading Period</label>
                <div class="grid grid-cols-3 gap-2">
                   <button type="button" id="sembtn-1" onclick="selectSemester(1)" class="py-2.5 rounded-xl border-2 text-xs font-bold transition border-primary bg-primary text-white">1st Sem</button>
                   <button type="button" id="sembtn-2" onclick="selectSemester(2)" class="py-2.5 rounded-xl border-2 text-xs font-bold transition border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary">2nd Sem</button>
                   <button type="button" id="sembtn-3" onclick="selectSemester(3)" class="py-2.5 rounded-xl border-2 text-xs font-bold transition border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary">All</button>
                </div>
            </div>

            <!-- Subject preview strip -->
            <div id="report-subject-preview" class="${guessedYear ? '' : 'hidden'}">
                <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Subjects for this Level</label>
                <div id="report-subject-tags" class="flex flex-wrap gap-1"></div>
            </div>
        </div>

        <button onclick="loadAcademicReport()" id="view-report-btn"
            class="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-sm transition shadow-md hover:bg-primaryDark flex items-center justify-center gap-2">
            <i class="fas fa-file-alt"></i> View Report
        </button>
    `;

    // Render tiny QR
    document.getElementById('qr-container-sel').innerHTML = '';
    if (typeof QRCode !== 'undefined') {
        new QRCode(document.getElementById('qr-container-sel'), {
            text: s.lrn, width: 56, height: 56,
            colorDark: '#166534', colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    // Default selected semester = 1
    _reportStudent._selectedSemester = 1;

    // Trigger initial subject preview if year detected
    if (guessedYear) onReportGradeChange(guessedYear);
}



function selectSemester(sem) {
    [1, 2, 3].forEach(i => {
        const btn = document.getElementById(`sembtn-${i}`);
        if (!btn) return;
        if (i === sem) {
            btn.className = 'py-2.5 rounded-xl border-2 text-xs font-bold transition border-primary bg-primary text-white';
        } else {
            btn.className = 'py-2.5 rounded-xl border-2 text-xs font-bold transition border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary';
        }
    });
    if (_reportStudent) _reportStudent._selectedSemester = sem;
    _refreshSubjectPreview();
}

/**
 * Called when Year Level dropdown changes.
 * Shows/hides strand dropdown and refreshes subject preview tags.
 */
function onReportGradeChange(gradeStr) {
    const gradeNum = parseInt((gradeStr || '').replace(/\D/g, '')) || 0;
    const isSH = gradeNum >= 11;
    const strandWrap = document.getElementById('report-strand-wrap');
    if (strandWrap) strandWrap.classList.toggle('hidden', !isSH);
    if (_reportStudent) _reportStudent._selectedYear = gradeStr;
    _refreshSubjectPreview();
}

function onReportStrandChange(strand) {
    if (_reportStudent) _reportStudent._selectedStrand = strand;
    _refreshSubjectPreview();
}

function _refreshSubjectPreview() {
    const preview = document.getElementById('report-subject-preview');
    const tags = document.getElementById('report-subject-tags');
    if (!preview || !tags) return;

    const gradeStr = document.getElementById('report-grade-level')?.value || '';
    const gradeNum = parseInt(gradeStr.replace(/\D/g, '')) || 0;
    if (!gradeNum) { preview.classList.add('hidden'); return; }

    const semester = _reportStudent?._selectedSemester || 1;
    const isSH = gradeNum >= 11;
    const level = isSH ? 'SH' : 'JH';
    const strand = document.getElementById('report-strand')?.value || 'Academic';

    let subjects = [];
    if (semester === 3) {
        subjects = [...new Set([...getSubjectsForReport(level, strand, gradeNum, 1), ...getSubjectsForReport(level, strand, gradeNum, 2)])];
    } else {
        subjects = getSubjectsForReport(level, strand, gradeNum, semester);
    }

    if (subjects.length === 0) {
        preview.classList.add('hidden'); return;
    }
    preview.classList.remove('hidden');
    tags.innerHTML = subjects.map(s =>
        `<span class="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded-full">${s}</span>`
    ).join('');
}

async function onReportSchoolYearChange(sy) {
    window.currentRecordSchoolYear = sy;
    const lrn = document.getElementById('report-modal')?.getAttribute('data-lrn');
    if (!lrn) return;

    // Refresh modal contents natively pulling the explicitly saved new school year references
    await viewStudent(lrn);
}

async function loadAcademicReport() {
    const s = _reportStudent;
    if (!s) return;

    const semester = s._selectedSemester || 1;
    const selectedSection = document.getElementById('report-section')?.value || s.section;
    const gradeStr = document.getElementById('report-grade-level')?.value || '';
    const selectedSY = document.getElementById('report-school-year')?.value || window.currentRecordSchoolYear || '2025-2026';

    const btn = document.getElementById('view-report-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...'; }

    const gradeNum = parseInt((gradeStr || '').replace(/\D/g, '')) || 0;
    const isSH = gradeNum >= 11;

    let qs = [];
    let semLabel = '';
    if (isSH) {
        qs = [1, 2, 3];
        semLabel = 'TRIMESTER (TERMS 1-3)';
    } else {
        if (semester === 1) { qs = [1, 2]; semLabel = 'FIRST SEMESTER (Q1 & Q2)'; }
        else if (semester === 2) { qs = [3, 4]; semLabel = 'SECOND SEMESTER (Q3 & Q4)'; }
        else { qs = [1, 2, 3, 4]; semLabel = 'FULL ACADEMIC YEAR'; }
    }

    let qData = { 1: [], 2: [], 3: [], 4: [] };
    try {
        // Optimization: Fetch all grades for all quarters in a single request, strictly bound to the requested school year
        const res = await fetch(`/api/students/${s.lrn}/subjects?school_year=${selectedSY}`, { headers: { 'Accept': 'application/json' } });
        if (res.ok) {
            const allGrades = await res.json();
            // Group locally
            allGrades.forEach(g => {
                if (qs.includes(g.quarter)) {
                    qData[g.quarter].push(g);
                }
            });
        } else {
            throw new Error(`Fetch failed: ${res.status}`);
        }
    } catch (e) {
        console.warn("API fetch failed, falling back to local data", e);
        qs.forEach(q => {
            qData[q] = (s.allSubjects || s.subjects || []).filter(x => (x.quarter || 1) == q);
        });
    }

    // Fetch monthly attendance for report
    let attRecords = [];
    try {
        const ar = await fetch(`/api/attendance/${s.lrn}`);
        if (ar.ok) attRecords = await ar.json();
    } catch (e) { console.warn("Att fetch fail", e); }

    const getGrade = (subs, name) => {
        const row = subs.find(x => x.n === name);
        return row && row.g != null ? parseFloat(row.g) : null;
    };

    const level = isSH ? 'SH' : 'JH';
    const strand = document.getElementById('report-strand')?.value || null;

    let catalogSubs;
    if (semester === 3) {
        catalogSubs = [...new Set([...getSubjectsForReport(level, strand, gradeNum, 1), ...getSubjectsForReport(level, strand, gradeNum, 2)])];
    } else {
        catalogSubs = getSubjectsForReport(level, strand, gradeNum, semester);
    }

    let allSubsFromDB = [];
    qs.forEach(q => Object.values(qData[q]).forEach(x => allSubsFromDB.push(x.n)));

    const extraFromDB = allSubsFromDB.filter(n => !catalogSubs.includes(n));
    const allSubjectNames = catalogSubs.length > 0
        ? [...new Set([...catalogSubs, ...extraFromDB])]
        : [...new Set([...allSubsFromDB, ...(s.subjects || []).map(x => x.n), ...coreSubjects])];

    const coreList = allSubjectNames.filter(n => coreSubjects.includes(n));
    const appliedList = allSubjectNames.filter(n => !coreSubjects.includes(n));

    // Build a row for the table
    function buildRow(subjectName) {
        let cells = '';
        let validGrades = [];
        qs.forEach(q => {
            const g = getGrade(qData[q], subjectName);
            if (g != null) validGrades.push(g);
            if (g != null) {
                cells += `<td class="border border-gray-400 py-1.5 px-2 text-center text-xs font-semibold ${g < 75 ? 'text-red-600' : 'text-gray-800'}">${g}</td>`;
            } else {
                cells += `<td class="border border-gray-400 py-1.5 px-2 text-center text-xs text-gray-300">—</td>`;
            }
        });

        let semFinal = null;
        if (validGrades.length > 0) {
            semFinal = Math.round(validGrades.reduce((a, b) => a + b, 0) / validGrades.length);
        }

        const passed = semFinal != null && semFinal >= 75;
        const remarks = semFinal != null ? (passed ? 'PASSED' : 'FAILED') : '—';
        const remarkClass = semFinal == null ? 'text-gray-400' : (passed ? 'text-green-700 font-bold' : 'text-red-600 font-bold');

        let finalCell = semFinal != null
            ? `<td class="border border-gray-400 py-1.5 px-2 text-center text-xs font-bold ${semFinal < 75 ? 'text-red-600' : 'text-gray-800'}">${semFinal}</td>`
            : `<td class="border border-gray-400 py-1.5 px-2 text-center text-xs text-gray-300">—</td>`;

        return `
            <tr class="hover:bg-gray-50">
                <td class="border border-gray-400 py-1.5 px-3 text-xs text-gray-700">${subjectName}</td>
                ${cells}
                ${finalCell}
                <td class="border border-gray-400 py-1.5 px-2 text-center text-[11px] ${remarkClass}">${remarks}</td>
            </tr>`;
    }

    const allGrades = allSubjectNames.map(n => {
        let vg = qs.map(q => getGrade(qData[q], n)).filter(g => g != null);
        return vg.length > 0 ? (vg.reduce((a, b) => a + b, 0) / vg.length) : null;
    }).filter(g => g != null);
    const genAvg = allGrades.length > 0 ? Math.round(allGrades.reduce((a, b) => a + b, 0) / allGrades.length) : null;
    const genAvgPassed = genAvg != null && genAvg >= 75;

    const area = document.getElementById('academic-report-area');
    if (!area) return;

    // Build Attendance Table HTML
    const sy = selectedSY;
    let attTotalSchool = 0;
    let attTotalPresent = 0;

    const attendanceRows = ATT_MONTHS.map(m => {
        const rec = attRecords.find(r => r.month === m.m && r.school_year === sy) || { school_days: m.d, days_present: m.d };
        attTotalSchool += rec.school_days;
        attTotalPresent += rec.days_present;
        return `
            <tr class="text-center border border-gray-400">
                <td class="border border-gray-400 py-1 font-bold text-[10px] bg-gray-50">${m.m}</td>
                <td class="border border-gray-400 p-1 text-[10px]">${rec.school_days}</td>
                <td class="border border-gray-400 p-1 text-[10px]">${rec.days_present}</td>
                <td class="border border-gray-400 p-1 text-[10px]">${rec.school_days - rec.days_present}</td>
            </tr>
        `;
    }).join('');

    const headers = qs.map(q => `<th class="border border-gray-400 py-2 px-2 text-center leading-tight">Q${q}</th>`).join('');

    area.innerHTML = `
        <div id="printable-report" class="font-sans text-gray-800">
            <!-- PAGE 1: FRONT (ATTENDANCE & SIGNATURES) -->
            <div class="page-container mb-8 print:mb-0 print:break-after-page print:pt-4" style="page-break-after: always; min-height: 100vh;">
                <div class="grid grid-cols-2 gap-8 h-full">
                    <!-- LEFT SIDE: ATTENDANCE -->
                    <div class="border-r border-gray-200 pr-8 print:border-black">
                        <h2 class="text-sm font-bold text-center uppercase mb-4 tracking-widest border-b border-gray-800 pb-2">Report on Attendance</h2>
                        <table class="w-full border-collapse border border-gray-400 text-[10px]">
                            <thead>
                                <tr class="bg-gray-100">
                                    <th class="border border-gray-400 py-1">Month</th>
                                    <th class="border border-gray-400 py-1">School Days</th>
                                    <th class="border border-gray-400 py-1">Days Present</th>
                                    <th class="border border-gray-400 py-1">Days Absent</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${attendanceRows}
                            </tbody>
                            <tfoot class="bg-gray-50 font-bold">
                                <tr>
                                    <td class="border border-gray-400 py-1 text-center">TOTAL</td>
                                    <td class="border border-gray-400 py-1 text-center">${attTotalSchool}</td>
                                    <td class="border border-gray-400 py-1 text-center">${attTotalPresent}</td>
                                    <td class="border border-gray-400 py-1 text-center">${attTotalSchool - attTotalPresent}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <div class="mt-8 space-y-6">
                            <h3 class="text-[10px] font-bold uppercase border-b border-gray-800 pb-1">Parent's/Guardian's Signature</h3>
                            ${(isSH ? [1, 2, 3] : [1, 2, 3, 4]).map(q => `
                                <div class="flex items-end gap-2 text-[10px]">
                                    <span class="shrink-0 w-20">${q === 1 ? '1st' : q === 2 ? '2nd' : q === 3 ? '3rd' : '4th'} ${isSH ? 'Term' : 'Quarter'}:</span>
                                    <div class="flex-1 border-b border-black h-4"></div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- RIGHT SIDE: STUDENT INFO -->
                    <div class="pl-4">
                        <div class="text-center mb-6">
                            <p class="text-[10px] font-bold">DepEd Form 138-A</p>
                            <h1 class="text-sm font-bold mt-2">Republic of the Philippines</h1>
                            <p class="text-[10px]">Department of Education</p>
                            <p class="text-[11px] font-bold mt-2 uppercase">City National High School</p>
                        </div>

                        <div class="mt-6 space-y-3 text-[10px]">
                            <div class="flex border-b border-gray-300 py-1"><span class="w-20 font-bold">Name:</span> <span>${s.name}</span></div>
                            <div class="flex border-b border-gray-300 py-1"><span class="w-20 font-bold">LRN:</span> <span>${s.lrn}</span></div>
                            <div class="flex border-b border-gray-300 py-1"><span class="w-20 font-bold">Grade/Sec:</span> <span>${s.section}</span></div>
                            <div class="flex border-b border-gray-300 py-1"><span class="w-20 font-bold">School Year:</span> <span>${sy}</span></div>
                        </div>

                        <div class="mt-20 grid grid-cols-2 gap-4 text-center text-[10px]">
                            <div class="space-y-1">
                                <div class="border-b border-black pt-8"></div>
                                <p class="font-bold">Class Adviser</p>
                            </div>
                            <div class="space-y-1">
                                <div class="border-b border-black pt-8"></div>
                                <p class="font-bold">Principal</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- PAGE 2: BACK (LEARNING ACHIEVEMENT) -->
            <div class="page-container print:pt-4" style="min-height: 100vh;">
                <!-- Screen-only header -->
                <div class="print:hidden mb-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 flex justify-between items-center">
                    <div>
                        <span class="inline-block px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full uppercase mb-1">${semLabel}</span>
                        <h4 class="text-sm font-bold text-gray-800 uppercase tracking-wide">Report on Learning Progress & Achievement</h4>
                    </div>
                    <div class="flex gap-2">
                         <button onclick="window.print()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition flex items-center gap-2 shadow-sm">
                            <i class="fas fa-print"></i> Print Report
                        </button>
                        <button onclick="closeReport()" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition">
                            Close
                        </button>
                    </div>
                </div>

                <!-- Print-only header for Page 2 -->
                <div class="hidden print:block text-center mb-4">
                    <h2 class="text-sm font-bold uppercase tracking-widest border-b-2 border-black pb-2">Report on Learning Progress and Achievement</h2>
                </div>

                <div class="overflow-hidden rounded-xl border border-gray-400 shadow-sm print:rounded-none">
                    <table class="w-full border-collapse text-sm bg-white">
                        <thead>
                            <tr class="bg-gray-100 print:bg-gray-50 uppercase text-[10px] font-bold">
                                <th class="border border-gray-400 py-2 px-3 text-left w-1/2">Learning Areas</th>
                                ${headers}
                                <th class="border border-gray-400 py-2 px-2 text-center leading-tight">Final<br>Grade</th>
                                <th class="border border-gray-400 py-2 px-2 text-center">Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${coreList.length > 0 ? `
                            <tr class="bg-gray-50 print:bg-white"><td colspan="${qs.length + 3}" class="border border-gray-400 py-1.5 px-3 text-[9px] font-bold text-gray-500 uppercase tracking-wider">Core Subjects</td></tr>
                            ${coreList.map(n => buildRow(n)).join('')}
                            ` : ''}
                            ${appliedList.length > 0 ? `
                            <tr class="bg-gray-50 print:bg-white"><td colspan="${qs.length + 3}" class="border border-gray-400 py-1.5 px-3 text-[9px] font-bold text-gray-500 uppercase tracking-wider">Applied &amp; Specialized Subjects</td></tr>
                            ${appliedList.map(n => buildRow(n)).join('')}
                            ` : ''}
                            <tr class="bg-gray-100 print:bg-white font-bold">
                                <td colspan="${qs.length + 1}" class="border border-gray-400 py-2 px-3 text-[11px] uppercase">General Average for the ${semester === 3 ? 'Academic Year' : 'Semester'}</td>
                                <td class="border border-gray-400 py-2 px-2 text-center text-sm ${genAvg != null && genAvg < 75 ? 'text-red-600' : 'text-primary'}">${genAvg ?? '—'}</td>
                                <td class="border border-gray-400 py-2 px-2 text-center text-[10px] ${genAvgPassed ? 'text-green-700' : 'text-red-600'}">${genAvg != null ? (genAvgPassed ? 'PASSED' : 'FAILED') : '—'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Grading Scale -->
                <div class="mt-6 p-4 border border-gray-400 bg-gray-50/50 print:bg-transparent">
                    <p class="text-[10px] font-bold uppercase tracking-wider mb-2">Grading Scale</p>
                    <div class="grid grid-cols-3 gap-2">
                        ${[
            ['Outstanding', '90–100', 'Passed'],
            ['Very Satisfactory', '85–89', 'Passed'],
            ['Satisfactory', '80–84', 'Passed'],
            ['Fairly Satisfactory', '75–79', 'Passed'],
            ['Did Not Meet Expectations', 'Below 75', 'Failed'],
        ].map(([d, r, rem]) => `
                            <span class="text-[9px] text-gray-700">${d}</span>
                            <span class="text-[9px] text-gray-700 text-center">${r}</span>
                            <span class="text-[9px] font-bold ${rem === 'Passed' ? 'text-green-700' : 'text-red-600'}">${rem}</span>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    area.classList.remove('hidden');
    document.getElementById('content-area').classList.add('hidden');
    document.getElementById('report-modal').classList.add('hidden');
    area.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-file-alt"></i> View Report';
    }
}

function closeReport() {
    document.getElementById('report-modal').classList.add('hidden');
    document.getElementById('academic-report-area').classList.add('hidden');
    document.getElementById('content-area').classList.remove('hidden');
    _reportStudent = null;
}

// PURE ID CARD MODAL
function showQRModal(lrn) {
    const s = students.find(x => x.lrn === lrn);
    if (!s) return;
    const modal = document.getElementById('id-card-modal');
    const content = document.getElementById('id-card-content');

    content.innerHTML = `
        <div class="border-2 border-gray-800 p-6 rounded-xl text-center bg-white shadow-sm w-full max-w-xs print:border-black print:p-4">
            <h2 class="text-xl font-bold text-black uppercase mb-1">CNHS Student ID</h2>
            <div class="w-full h-px bg-gray-300 mb-4 print:bg-black"></div>
            <div class="flex justify-center mb-4">
                <div id="pure-qr-container" class="p-2 border-4 border-primary rounded-lg bg-white print:border-black" title="Student QR Identity"></div>
            </div>
            <h3 class="text-2xl font-bold text-gray-900 print-text-black mb-1">${s.name}</h3>
            <p class="text-sm text-gray-600 font-mono print-text-black mb-1">LRN: ${s.lrn}</p>
            <p class="text-sm text-gray-600 print-text-black">Section: <span class="font-bold text-gray-800 print-text-black">${s.section}</span></p>
            <p class="text-xs text-gray-500 mt-4 print-text-black italic">Scan to view academic performance</p>
        </div>
        <div class="mt-6 flex justify-center gap-3 no-print w-full">
            <button onclick="window.print()" class="w-full px-5 py-3 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow-sm flex justify-center items-center gap-2">
                <i class="fas fa-print"></i> Print ID Card
            </button>
        </div>
    `;
    modal.classList.remove('hidden');

    document.getElementById("pure-qr-container").innerHTML = "";
    new QRCode(document.getElementById("pure-qr-container"), {
        text: s.lrn,
        width: 140,
        height: 140,
        colorDark: "#166534",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

function closeQRModal() { document.getElementById('id-card-modal').classList.add('hidden'); }

// --- GEMINI API ---
async function callGemini(prompt, b64) {
    // Automatically switch models: Use preview model for Canvas, use standard 2.5-flash for your personal key.
    const modelName = API_KEY === "" ? "gemini-2.5-flash-preview-09-2025" : "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

    const parts = [{ text: prompt }];
    if (b64) parts.push({ inlineData: { mimeType: "image/jpeg", data: b64.split(',')[1] } });

    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: parts }] }) });
        const result = await response.json();

        if (result.error) {
            console.error("Gemini API Error:", result.error);
            return `Error: ${result.error.message || "Failed to contact AI."}`;
        }

        if (result.candidates && result.candidates.length > 0) {
            return result.candidates[0].content.parts[0].text;
        } else {
            return "Error: Received empty response from AI.";
        }
    } catch (e) {
        console.error("Fetch error:", e);
        return "Error: Could not connect to AI service.";
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('mobile-hidden');

    const overlay = document.getElementById('mobile-overlay');
    if (overlay) {
        if (overlay.classList.contains('hidden')) {
            overlay.classList.remove('hidden');
            overlay.classList.remove('pointer-events-none');
            // Slight delay for transition to trigger
            setTimeout(() => overlay.classList.remove('opacity-0'), 10);
        } else {
            overlay.classList.add('opacity-0');
            overlay.classList.add('pointer-events-none');
            setTimeout(() => overlay.classList.add('hidden'), 300);
        }
    }
}

function toggleSidebarTree(menuId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    if (menuId === 'records') {
        const submenu = document.getElementById('nav-records-submenu');
        const chevron = document.getElementById('nav-records-chevron');
        if (submenu) {
            if (submenu.classList.contains('hidden')) {
                submenu.classList.remove('hidden');
                if (chevron) chevron.classList.add('rotate-180');
            } else {
                submenu.classList.add('hidden');
                if (chevron) chevron.classList.remove('rotate-180');
            }
        }
    }
}

function jumpToRecordsTab(tabName) {
    adminRecordsTab = tabName;

    // Clear out any selected teacher/section so we start at the top level
    if (typeof adminSelectedTeacher !== 'undefined') {
        adminSelectedTeacher = null;
        adminSelectedSection = null;
    }

    if (sessionStorage.getItem('cnhs_active_view') !== 'records') {
        navigate('records');
    } else {
        renderRecords(document.getElementById('content-area'));
    }

    if (window.innerWidth < 1024 && !document.getElementById('sidebar').classList.contains('-translate-x-full')) {
        toggleSidebar();
    }
}

function toggleDesktopSidebar() {
    const sidebar = document.getElementById('sidebar');
    const isCollapsed = sidebar.classList.toggle('collapsed');

    if (isCollapsed) {
        document.getElementById('nav-records-submenu')?.classList.add('hidden');
        document.getElementById('nav-records-chevron')?.classList.remove('rotate-180');
    }
}

// Session Recovery on Page Load
document.addEventListener('DOMContentLoaded', async () => {
    const activeSession = sessionStorage.getItem('cnhs_session');
    const path = location.pathname;
    const isAppPath = path.startsWith('/admin') || path.startsWith('/teacher');

    if (activeSession) {
        try {
            const savedUser = JSON.parse(activeSession);

            // Hide login, show app
            const loginScreen = document.getElementById('login-screen');
            if (loginScreen) loginScreen.classList.add('hidden');
            document.getElementById('app-container').classList.remove('hidden');

            // --- 1. IMMEDIATE UI RESTORATION (Prevents "GUEST" flicker) ---
            currentUser.role = savedUser.role;
            currentUser.name = savedUser.name;
            currentUser.id = savedUser.id;
            currentUser.db_id = savedUser.db_id;
            currentUser.subject = savedUser.subject;
            currentUser.isAdviser = savedUser.isAdviser;
            currentUser.section = savedUser.section;

            if (document.getElementById('role-tag')) {
                document.getElementById('role-tag').innerText = currentUser.role.toUpperCase();
                document.getElementById('user-display-name').innerText = currentUser.name;
                document.getElementById('user-display-role').innerText = currentUser.role;

                const isInvalidPic = !savedUser.profile_picture || savedUser.profile_picture === 'null' || savedUser.profile_picture === '';
                currentUser.profile_picture = isInvalidPic ? null : savedUser.profile_picture;
                const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'User')}&background=166534&color=fff&font-size=0.4`;
                document.getElementById('user-display-avatar').src = isInvalidPic ? defaultAvatar : currentUser.profile_picture;
            }

            // Show authorized sidebar items immediately
            if (currentUser.role === 'admin') {
                document.getElementById('nav-manage-teachers')?.classList.remove('hidden');
                document.getElementById('nav-subjects')?.classList.remove('hidden');
                document.getElementById('nav-assign-section')?.classList.remove('hidden');
                document.getElementById('nav-logs')?.classList.remove('hidden');
                document.getElementById('nav-analytics')?.classList.remove('hidden');
                document.getElementById('nav-settings')?.classList.remove('hidden');
            } else if (currentUser.role === 'teacher') {
                document.getElementById('nav-adviser')?.classList.remove('hidden');
            }

            // --- Determine View ---
            let view = 'dashboard';
            const segments = path.split('/').filter(Boolean);
            if (segments.length >= 2) {
                const roleInPath = segments[0];
                const last = segments[segments.length - 1];

                // Security check
                if (roleInPath !== currentUser.role) {
                    location.href = `/${currentUser.role}/dashboard`;
                    return;
                }

                if (last === 'add-students') view = 'add-student';
                else if (last === 'activity-logs') view = 'logs';
                else view = last;
            } else {
                view = sessionStorage.getItem('cnhs_active_view') || 'dashboard';
            }

            // 1. Immediate UI rendering (displays structure instantly, no blank screen)
            navigate(view, true);

            // 2. Async data loading in background
            await initAppData();

            // 3. Re-render now that data is available
            navigate(view, true);
        } catch (e) {
            console.error("Session recovery failed:", e);
            sessionStorage.clear();
            if (isAppPath) {
                location.href = path.startsWith('/admin') ? '/login/admin' : '/login/teacher';
            }
        }
    } else if (isAppPath) {
        location.href = path.startsWith('/admin') ? '/login/admin' : '/login/teacher';
    }
});

/**
 * ATTENDANCE MODAL LOGIC
 */
let currentAttendanceLRN = null;

async function openAttendanceModal(lrn) {
    currentAttendanceLRN = lrn;
    const s = students.find(x => x.lrn === lrn);
    if (!s) return;

    document.getElementById('att-student-name').innerText = `Attendance Record for ${s.name}`;
    document.getElementById('attendance-modal').classList.remove('hidden');

    // Fetch existing records
    let records = [];
    currentAbsenceLogs = [];
    try {
        const res = await fetch(`/api/attendance/${lrn}`);
        if (res.ok) records = await res.json();
    } catch (e) { console.warn("Could not fetch attendance", e); }

    // Aggregate daily_marks from all months
    records.forEach(r => {
        if (r.daily_marks) {
            try {
                let marks = typeof r.daily_marks === 'string' ? JSON.parse(r.daily_marks) : r.daily_marks;
                if (Array.isArray(marks)) {
                    currentAbsenceLogs = currentAbsenceLogs.concat(marks);
                }
            } catch (e) {}
        }
    });
    // Deduplicate and sort
    currentAbsenceLogs = [...new Set(currentAbsenceLogs)].sort((a, b) => new Date(b) - new Date(a));

    renderAttendanceTable(records);
    renderAbsenceLogs();
}

let currentAbsenceLogs = [];

function renderAbsenceLogs() {
    const container = document.getElementById('absence-logs-container');
    if (!container) return;
    
    if (currentAbsenceLogs.length === 0) {
        container.innerHTML = '<div class="text-[10px] text-gray-400 italic text-center py-2 bg-gray-50 rounded border border-dashed border-gray-200">No specific absence logs recorded yet.</div>';
        return;
    }
    
    container.innerHTML = currentAbsenceLogs.map((log, i) => {
        const dateObj = new Date(log);
        const formatted = isNaN(dateObj) ? log : dateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });
        return `
            <div class="flex justify-between items-center bg-red-50 text-red-600 px-3 py-2 rounded-lg border border-red-100 text-xs font-medium">
                <div class="flex items-center gap-2"><i class="fas fa-calendar-times opacity-50"></i> ${formatted}</div>
                <button onclick="removeAbsenceLog(${i})" class="text-red-400 hover:text-red-700 transition" title="Remove log"><i class="fas fa-times"></i></button>
            </div>
        `;
    }).join('');
}

function addAbsenceLog() {
    const input = document.getElementById('new-absence-datetime');
    if (!input || !input.value) return showMessage("Please select a valid date and time.", true);
    
    const dt = new Date(input.value).toISOString();
    if (!currentAbsenceLogs.includes(dt)) {
        currentAbsenceLogs.unshift(dt);
        // Sort descending
        currentAbsenceLogs.sort((a, b) => new Date(b) - new Date(a));
        renderAbsenceLogs();
        
        // Auto-increment the absent count for the respective month if possible
        const m = new Date(input.value).toLocaleString('en-US', { month: 'short' });
        const row = document.getElementById(`att-row-${m}`);
        if (row) {
            const schoolInput = row.querySelector(`[data-field="school_days"]`);
            const presentInput = row.querySelector(`[data-field="days_present"]`);
            if (presentInput.value !== '' && schoolInput.value !== '') {
                const s = parseInt(schoolInput.value);
                let p = parseInt(presentInput.value);
                if (p > 0) {
                    presentInput.value = p - 1;
                    updateAttTotals();
                }
            }
        }
    }
    input.value = '';
}

function removeAbsenceLog(index) {
    if (index > -1 && index < currentAbsenceLogs.length) {
        currentAbsenceLogs.splice(index, 1);
        renderAbsenceLogs();
    }
}

function renderAttendanceTable(existingRecords) {
    const tbody = document.getElementById('att-table-body');
    const sy = window.currentRecordSchoolYear || '2025-2026';

    const rows = ATT_MONTHS.map(monthObj => {
        const month = monthObj.m;
        const rec = existingRecords.find(r => r.month === month && r.school_year === sy) || { school_days: monthObj.d, days_present: '' };

        return `
            <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition" id="att-row-${month}">
                <td class="px-4 py-3 font-bold text-gray-700">${month}</td>
                <td class="px-4 py-3">
                    <input type="number" data-month="${month}" data-field="school_days" value="${rec.school_days}" 
                        oninput="updateAttTotals()"
                        class="w-20 px-2 py-1 border border-gray-200 rounded outline-none focus:border-primary text-center font-mono">
                </td>
                <td class="px-4 py-3">
                    <input type="number" data-month="${month}" data-field="days_present" value="${rec.days_present}" 
                        oninput="updateAttTotals()"
                        class="w-20 px-2 py-1 border border-gray-200 rounded outline-none focus:border-primary text-center font-mono font-bold text-primary">
                </td>
                <td class="px-4 py-3 font-mono text-gray-400" id="absent-${month}">
                    ${rec.days_present === '' ? 0 : (rec.school_days - rec.days_present)}
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rows;
    updateAttTotals();
}

function updateAttTotals() {
    let totalSchool = 0;
    let totalPresent = 0;
    let totalAbsent = 0;

    ATT_MONTHS.forEach(m => {
        const month = m.m;
        const row = document.getElementById(`att-row-${month}`);
        if (!row) return;

        const schoolVal = parseInt(row.querySelector(`[data-field="school_days"]`).value) || 0;
        const presentInput = row.querySelector(`[data-field="days_present"]`);
        const presentVal = presentInput.value === '' ? 0 : parseInt(presentInput.value);

        const absent = presentInput.value === '' ? 0 : (schoolVal - presentVal);
        document.getElementById(`absent-${month}`).innerText = absent;

        totalSchool += schoolVal;
        totalPresent += presentVal;
        totalAbsent += absent;
    });

    document.getElementById('att-total-school').innerText = totalSchool;
    document.getElementById('att-total-present').innerText = totalPresent;
    document.getElementById('att-total-absent').innerText = totalAbsent;
}

async function saveAttendanceRecord() {
    const sy = window.currentRecordSchoolYear || '2025-2026';
    const records = [];

    ATT_MONTHS.forEach(m => {
        const month = m.m;
        const row = document.getElementById(`att-row-${month}`);
        if (!row) return;

        const school_days = parseInt(row.querySelector(`[data-field="school_days"]`).value) || 0;
        const days_present = parseInt(row.querySelector(`[data-field="days_present"]`).value) || 0;
        
        // Find logs that belong to this month
        const monthLogs = currentAbsenceLogs.filter(log => {
            const dateObj = new Date(log);
            return !isNaN(dateObj) && dateObj.toLocaleString('en-US', { month: 'short' }) === month;
        });

        records.push({ month, school_days, days_present, school_year: sy, daily_marks: monthLogs });
    });

    const lrn = currentAttendanceLRN;
    try {
        const res = await fetch('/api/attendance/save-bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lrn, records })
        });

        if (res.ok) {
            // Update local student object to reflected percentage
            const s = students.find(x => x.lrn === lrn);
            if (s) {
                const totalSchool = records.reduce((a, b) => a + b.school_days, 0);
                const totalPresent = records.reduce((a, b) => a + b.days_present, 0);
                s.attendance = totalSchool > 0 ? parseFloat(((totalPresent / totalSchool) * 100).toFixed(2)) : 0;

                // Sync the saved monthly records into the local student object
                if (!s.lastAttendanceRecords) s.lastAttendanceRecords = [];
                records.forEach(rec => {
                    const existingIdx = s.lastAttendanceRecords.findIndex(r => r.month === rec.month && r.school_year === rec.school_year);
                    if (existingIdx !== -1) {
                        s.lastAttendanceRecords[existingIdx].school_days = rec.school_days;
                        s.lastAttendanceRecords[existingIdx].days_present = rec.days_present;
                    } else {
                        s.lastAttendanceRecords.push({
                            month: rec.month,
                            school_year: rec.school_year,
                            school_days: rec.school_days,
                            days_present: rec.days_present,
                            daily_marks: []
                        });
                    }
                });

                // Save percentage to Student table main record
                await fetch(`/api/students/${s.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ attendance: s.attendance })
                });
            }

            showMessage("Attendance saved successfully!");
            closeAttendanceModal();
            renderRecords(document.getElementById('content-area'));
        } else {
            showMessage("Failed to save attendance record.", true);
        }
    } catch (e) {
        console.error(e);
        showMessage("An error occurred.", true);
    }
}

function closeAttendanceModal() {
    document.getElementById('attendance-modal').classList.add('hidden');
}

// Handle browser back/forward buttons
window.onpopstate = (e) => {
    if (e.state && e.state.view) {
        navigate(e.state.view, true);
    } else if (sessionStorage.getItem('cnhs_session')) {
        // Fallback to dashboard if logged in but no state
        navigate('dashboard', true);
    }
};

function completeStudentLogin(student) {
    sessionStorage.setItem('cnhs_student_session', JSON.stringify({
        role: 'student',
        name: student.name,
        lrn: student.lrn,
        id: student.id,
        section: student.section,
        adviser: student.adviser,
        profile_picture: student.profile_picture
    }));
    window.location.href = '/student/dashboard';
}

window.activeUndoToasts = {};

function showUndoToast(message, onUndo, onFinalize, timeout = 5000) {
    const toastId = 'undo-' + Date.now();
    
    // Create toast container if not exists
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2';
        document.body.appendChild(container);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = 'bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-4 animate-slide-up text-sm font-medium';
    toast.innerHTML = `
        <span>${message}</span>
        <button id="btn-${toastId}" class="text-primary font-bold hover:text-green-400 transition ml-2">Undo</button>
    `;
    container.appendChild(toast);
    
    let isReverted = false;
    
    const finalizeWrapper = async () => {
        if (isReverted) return;
        delete window.activeUndoToasts[toastId];
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
        if (onFinalize) await onFinalize();
    };
    
    const timer = setTimeout(finalizeWrapper, timeout);
    window.activeUndoToasts[toastId] = timer;
    
    document.getElementById(`btn-${toastId}`).onclick = async () => {
        isReverted = true;
        clearTimeout(timer);
        delete window.activeUndoToasts[toastId];
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
        if (onUndo) await onUndo();
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// GRADING WEIGHTS MODAL LOGIC
// ─────────────────────────────────────────────────────────────────────────────

function openGradingWeightsModal(subject) {
    const s = (subject || '').toLowerCase();
    const weights = getSubjectWeights(subject);
    
    const ww = Math.round(weights.ww * 100);
    const pt = Math.round(weights.pt * 100);
    const qa = Math.round(weights.qa * 100);

    const modalHtml = `
        <div id="grading-weights-modal" class="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm animate-fade-in">
            <div class="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6 animate-slide-up transform transition-all relative">
                <button onclick="document.getElementById('grading-weights-modal').remove()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><i class="fas fa-times"></i></button>
                <div class="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl mb-4">
                    <i class="fas fa-balance-scale"></i>
                </div>
                <h3 class="text-xl font-black text-gray-800 mb-1">Edit Grading Weights</h3>
                <p class="text-xs text-gray-500 mb-6 font-medium">Customize the percentage distribution for <b>${subject || 'this subject'}</b>. Must total 100%.</p>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Written Works (%)</label>
                        <input type="number" id="gw-ww" value="${ww}" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition" oninput="updateGradingTotal()">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Performance Tasks (%)</label>
                        <input type="number" id="gw-pt" value="${pt}" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition" oninput="updateGradingTotal()">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Assessment (%)</label>
                        <input type="number" id="gw-qa" value="${qa}" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition" oninput="updateGradingTotal()">
                    </div>
                </div>

                <div class="mt-4 p-3 rounded-xl bg-gray-50 border border-gray-100 flex justify-between items-center">
                    <span class="text-xs font-bold text-gray-600">Total:</span>
                    <span id="gw-total" class="text-sm font-black text-emerald-600">100%</span>
                </div>
                
                <div class="mt-6 flex gap-3">
                    <button onclick="saveGradingWeights('${subject}')" id="gw-save-btn" class="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition">Save Weights</button>
                    <button onclick="resetGradingWeights('${subject}')" class="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition tooltip-trigger" title="Reset to DepEd Default"><i class="fas fa-undo"></i></button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function updateGradingTotal() {
    const ww = parseInt(document.getElementById('gw-ww').value) || 0;
    const pt = parseInt(document.getElementById('gw-pt').value) || 0;
    const qa = parseInt(document.getElementById('gw-qa').value) || 0;
    const total = ww + pt + qa;
    
    const totalEl = document.getElementById('gw-total');
    const saveBtn = document.getElementById('gw-save-btn');
    
    totalEl.textContent = total + '%';
    if (total === 100) {
        totalEl.className = 'text-sm font-black text-emerald-600';
        saveBtn.disabled = false;
        saveBtn.className = 'flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition';
    } else {
        totalEl.className = 'text-sm font-black text-red-500';
        saveBtn.disabled = true;
        saveBtn.className = 'flex-1 py-3 bg-gray-300 text-gray-500 font-bold rounded-xl cursor-not-allowed';
    }
}

function saveGradingWeights(subject) {
    const ww = (parseInt(document.getElementById('gw-ww').value) || 0) / 100;
    const pt = (parseInt(document.getElementById('gw-pt').value) || 0) / 100;
    const qa = (parseInt(document.getElementById('gw-qa').value) || 0) / 100;
    
    if (ww + pt + qa !== 1) return;
    
    const s = (subject || '').toLowerCase();
    localStorage.setItem('grading_weights_' + s, JSON.stringify({ ww, pt, qa }));
    
    document.getElementById('grading-weights-modal').remove();
    showPremiumToast('success', 'Grading weights updated for ' + (subject || 'subject'));
    
    // Re-render records view
    if (typeof renderRecords === 'function') {
        renderRecords(document.getElementById('content-area'));
    }
}

function resetGradingWeights(subject) {
    const s = (subject || '').toLowerCase();
    localStorage.removeItem('grading_weights_' + s);
    
    document.getElementById('grading-weights-modal').remove();
    showPremiumToast('success', 'Reset to DepEd default weights');
    
    // Re-render records view
    if (typeof renderRecords === 'function') {
        renderRecords(document.getElementById('content-area'));
    }
}
