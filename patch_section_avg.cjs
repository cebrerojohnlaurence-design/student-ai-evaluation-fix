const fs = require('fs');
const file = 'd:/practice/practice/ai-driven/public/js/admin/dashboard.js';
let content = fs.readFileSync(file, 'utf8');

const newHtml = `
        <!-- Section Average Modal -->
        <div id="dash-section-avg-modal" class="hidden fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-scale-up">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-green-50/50">
                    <h3 class="text-xl font-bold text-green-800"><i class="fas fa-trophy mr-2 text-green-500"></i>Section Leaderboard</h3>
                    <button onclick="document.getElementById('dash-section-avg-modal').classList.add('hidden')" class="text-gray-400 hover:text-red-500 transition"><i class="fas fa-times text-xl"></i></button>
                </div>
                
                <!-- AI Section Insight -->
                <div id="section-avg-ai-insight" class="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 p-5 flex items-center gap-4">
                     <i class="fas fa-robot text-3xl text-green-500 opacity-80 shadow-sm rounded-full bg-white p-2 border border-green-100"></i>
                     <p class="text-sm text-green-800 leading-relaxed italic" id="section-avg-insight-text">Analyzing section performance...</p>
                </div>

                <div class="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="section-avg-grid">
                        <!-- Populated by JS -->
                    </div>
                </div>
            </div>
        </div>
`;

if (!content.includes('dash-section-avg-modal')) {
    content = content.replace('<!-- Drilldown Modal -->', newHtml + '\n        <!-- Drilldown Modal -->');
}

const newJs = `
window.openSectionAverageModal = function() {
    let filtered = getFilteredDashboardStudents();
    
    // Group by section
    const sections = {};
    filtered.forEach(s => {
        if (!s.section) return;
        if (!sections[s.section]) sections[s.section] = { name: s.section, students: [], sum: 0, count: 0 };
        if (s.gwa > 0) {
            sections[s.section].students.push(s);
            sections[s.section].sum += parseFloat(s.gwa);
            sections[s.section].count++;
        }
    });

    const secArr = Object.values(sections).filter(s => s.count > 0).map(s => {
        s.avg = (s.sum / s.count).toFixed(2);
        // sort students in section by GWA highest to lowest
        s.students.sort((a,b) => b.gwa - a.gwa);
        return s;
    });

    // Sort sections by average GWA highest to lowest
    secArr.sort((a,b) => b.avg - a.avg);

    const grid = document.getElementById('section-avg-grid');
    if (!grid) return;

    let html = '';
    secArr.forEach((sec, idx) => {
        const topStudent = sec.students[0];
        const isTop = idx === 0;
        const medal = isTop ? '<i class="fas fa-medal text-yellow-500 text-xl ml-2 drop-shadow-sm"></i>' : '';
        const bgClass = isTop ? 'bg-gradient-to-br from-yellow-50 to-white border-yellow-200' : 'bg-white border-gray-100';
        
        let topStudentHtml = '';
        if (topStudent) {
            topStudentHtml = \`
                <div class="mt-4 pt-4 border-t border-gray-100">
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2"><i class="fas fa-star text-yellow-400 mr-1"></i>Top Performing Student</p>
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 font-bold border border-green-100 overflow-hidden shadow-inner">
                            \${topStudent.photo ? \`<img src="\${topStudent.photo}" class="w-full h-full object-cover rounded-xl">\` : topStudent.name.charAt(0)}
                        </div>
                        <div>
                            <p class="text-sm font-bold text-gray-800 truncate max-w-[200px]">\${topStudent.name}</p>
                            <p class="text-xs font-mono text-gray-500">GWA: <span class="font-bold text-green-600">\${topStudent.gwa}</span></p>
                        </div>
                    </div>
                </div>
            \`;
        }

        html += \`
            <div class="rounded-2xl border \${bgClass} shadow-sm p-5 hover:shadow-md transition-shadow relative overflow-hidden group">
                \${isTop ? '<div class="absolute -right-10 -top-10 w-24 h-24 bg-yellow-100 rounded-full blur-2xl opacity-50"></div>' : ''}
                <div class="flex justify-between items-start relative z-10">
                    <div>
                        <h4 class="text-lg font-black text-gray-800 flex items-center">\${sec.name} \${medal}</h4>
                        <p class="text-xs text-gray-500 font-bold mt-1"><i class="fas fa-users mr-1"></i>\${sec.count} Graded Students</p>
                    </div>
                    <div class="bg-green-100 text-green-700 font-black text-xl px-3 py-2 rounded-xl border border-green-200 shadow-inner">
                        \${sec.avg}
                    </div>
                </div>
                \${topStudentHtml}
            </div>
        \`;
    });

    if (secArr.length === 0) {
        html = '<div class="col-span-1 md:col-span-2 text-center py-10 text-gray-400 italic font-bold">No sections with graded students available yet.</div>';
    }

    grid.innerHTML = html;

    // AI Insight logic
    const insightText = document.getElementById('section-avg-insight-text');
    if (insightText) {
        if (secArr.length > 1) {
            const highest = secArr[0];
            const lowest = secArr[secArr.length - 1];
            insightText.innerHTML = \`<strong>\${highest.name}</strong> is currently leading with an outstanding average GWA of <strong>\${highest.avg}</strong>. Meanwhile, <strong>\${lowest.name}</strong> requires more academic support, currently averaging <strong>\${lowest.avg}</strong>. Interventions are recommended for struggling sections.\`;
        } else if (secArr.length === 1) {
            insightText.innerHTML = \`<strong>\${secArr[0].name}</strong> is performing well with an average GWA of <strong>\${secArr[0].avg}</strong>. Keep up the good work!\`;
        } else {
            insightText.innerHTML = \`Not enough graded data to generate section insights yet. Ensure students have grades encoded.\`;
        }
    }

    document.getElementById('dash-section-avg-modal').classList.remove('hidden');
};
`;

if (!content.includes('window.openSectionAverageModal = function()')) {
    content += '\n' + newJs;
}

fs.writeFileSync(file, content);
console.log('Section Average modal injected');
