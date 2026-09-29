const fs = require('fs');
const file = 'd:/practice/practice/ai-driven/public/js/admin/dashboard.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Move getFilteredDashboardStudents to getBaseDashboardStudents, and add global filters
const oldGetFiltered = /function getFilteredDashboardStudents\(\) \{[\s\S]*?return curr;\n\}/;
const oldMatch = content.match(oldGetFiltered);
if (oldMatch) {
    const newGetFiltered = `window.globalDashGradeFilter = 'All';
window.globalDashSectionFilter = 'All';

function getBaseDashboardStudents() {
` + oldMatch[0].replace('function getFilteredDashboardStudents() {', '') + `

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

window.onGlobalDashFilterChange = function(el, type) {
    if (type === 'grade') {
        window.globalDashGradeFilter = el.value;
        window.globalDashSectionFilter = 'All'; // reset section if grade changes
    } else {
        window.globalDashSectionFilter = el.value;
    }
    renderDashboard();
};
`;

    content = content.replace(oldGetFiltered, newGetFiltered);
}

// 2. Add global filters HTML in renderDashboard
const overviewHtmlRegex = /<div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 animate-fade-in">\s*<h2 class="text-2xl font-bold text-gray-800 tracking-tight">Overview<\/h2>\s*<\/div>/;

const newOverviewHtml = `<div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 animate-fade-in">
            <h2 class="text-2xl font-bold text-gray-800 tracking-tight">Overview</h2>
            <div class="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                <div class="flex items-center bg-gray-50 px-2 rounded-lg border border-gray-100">
                    <i class="fas fa-filter text-gray-400 text-[10px] mr-1"></i>
                    <select id="global-dash-grade" onchange="onGlobalDashFilterChange(this, 'grade')" class="text-xs bg-transparent outline-none py-1.5 font-bold text-gray-600 cursor-pointer">
                        <option value="All">All Grades</option>
                    </select>
                </div>
                <div class="flex items-center bg-gray-50 px-2 rounded-lg border border-gray-100">
                    <select id="global-dash-section" onchange="onGlobalDashFilterChange(this, 'section')" class="text-xs bg-transparent outline-none py-1.5 font-bold text-gray-600 cursor-pointer">
                        <option value="All">All Sections</option>
                    </select>
                </div>
            </div>
        </div>`;

content = content.replace(overviewHtmlRegex, newOverviewHtml);

// 3. Remove dropdowns from AI Insight
const aiInsightHtmlRegex = /<select id="ai-grade-level"[\s\S]*?<\/select>\s*<select id="ai-section-filter"[\s\S]*?<\/select>/;
content = content.replace(aiInsightHtmlRegex, '');

// 4. Update the updateDashGradeDropdown logic
const updateGradeRegex = /function updateDashGradeDropdown\(selectId\) \{[\s\S]*?gradeSelect\.innerHTML = html;\n\}/;
const newUpdateGrade = `function updateDashGradeDropdown(selectId) {
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
    
    const grades = Array.from(gradesSet).sort((a,b) => {
        const numA = parseInt(a.replace(/\\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\\D/g, '')) || 0;
        return numA - numB;
    });

    let html = \`<option value="All">All Grades</option>\`;
    grades.forEach(g => {
        html += \`<option value="\${g}">\${g}</option>\`;
    });
    
    if (grades.length === 0 && currentUser.role !== 'teacher') {
        let fallbackGrades = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
        if (currentUser.role === 'curriculum_coordinator') {
            if (currentUser.department === 'JHS') fallbackGrades = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
            else if (currentUser.department === 'SHS') fallbackGrades = ['Grade 11', 'Grade 12'];
        }
        fallbackGrades.forEach(g => {
             html += \`<option value="\${g}">\${g}</option>\`;
        });
    }
    gradeSelect.innerHTML = html;
}`;

content = content.replace(updateGradeRegex, newUpdateGrade);

// 5. Update the updateDashSectionDropdown logic
const updateSectionRegex = /function updateDashSectionDropdown\(selectId\) \{[\s\S]*?secSelect\.innerHTML = html;\n\}/;
const newUpdateSection = `function updateDashSectionDropdown(selectId) {
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
         html += \`<option value="\${sec}">\${sec}</option>\`;
    });
    
    secSelect.innerHTML = html;
}`;
content = content.replace(updateSectionRegex, newUpdateSection);

// 6. Update the end of renderDashboard
const endRenderRegex = /updateDashGradeDropdown\('ai-grade-level'\);\s*updateDashSectionDropdown\('ai-section-filter'\);/;
const newEndRender = `updateDashGradeDropdown('global-dash-grade');
    updateDashSectionDropdown('global-dash-section');
    
    const gSel = document.getElementById('global-dash-grade');
    const sSel = document.getElementById('global-dash-section');
    if(gSel) gSel.value = window.globalDashGradeFilter;
    if(sSel) sSel.value = window.globalDashSectionFilter;`;
    
content = content.replace(endRenderRegex, newEndRender);

// 7. Update generateDashboardInsights to use global filters
const genInsightsRegex = /const gradeFilter = document\.getElementById\('ai-grade-level'\) \? document\.getElementById\('ai-grade-level'\)\.value : 'All';\s*const sectionFilter = document\.getElementById\('ai-section-filter'\) \? document\.getElementById\('ai-section-filter'\)\.value : 'All';/;
const newGenInsights = `const gradeFilter = window.globalDashGradeFilter || 'All';
    const sectionFilter = window.globalDashSectionFilter || 'All';`;
    
content = content.replace(genInsightsRegex, newGenInsights);

fs.writeFileSync(file, content);
console.log('Global filters fully implemented!');
