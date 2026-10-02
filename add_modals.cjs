const fs = require('fs');
let content = fs.readFileSync('public/js/student/dashboard.js', 'utf-8');

const functionsToAdd = `
    // --- Modals Logic ---
    window.openAcademicStatusModal = function() {
        const modal = document.getElementById('academic-modal');
        const aiLoading = document.getElementById('ai-loading');
        const aiContent = document.getElementById('ai-content');
        if (modal) {
            modal.classList.remove('hidden');
            if (aiLoading) aiLoading.classList.remove('hidden');
            if (aiContent) aiContent.classList.add('hidden');

            setTimeout(() => {
                if (aiLoading) aiLoading.classList.add('hidden');
                if (aiContent) {
                    aiContent.classList.remove('hidden');
                    
                    let gwa = 0;
                    if (window.studentData && window.studentData.subjects) {
                        const q1 = window.studentData.subjects.filter(s => s.quarter == 1 && s.g).map(s => parseFloat(s.g));
                        if (q1.length > 0) gwa = q1.reduce((a,b)=>a+b,0) / q1.length;
                    }
                    
                    let msg = "";
                    if (gwa >= 90) msg = "Excellent work! Keep up the outstanding performance.";
                    else if (gwa >= 85) msg = "Great job! You are doing very well. Keep striving for excellence.";
                    else if (gwa >= 75) msg = "You are passing, but there is room for improvement. Focus on your weaker subjects.";
                    else if (gwa > 0) msg = "You are currently at risk. Please seek help from your teachers or adviser.";
                    else msg = "No sufficient data to generate academic insights yet. Complete your requirements for the term.";
                    
                    aiContent.innerHTML = '<p>' + msg + '</p>';
                }
            }, 800);
        }
    };

    window.closeAcademicStatusModal = function() {
        const modal = document.getElementById('academic-modal');
        if (modal) modal.classList.add('hidden');
    };

    window.openAttendanceModal = function() {
        if (!window.studentData || !window.studentData.attendance_months) {
            Swal.fire({
                icon: 'info',
                title: 'No Data',
                text: 'Attendance data has not been encoded yet.'
            });
            return;
        }

        let html = '<div class="overflow-x-auto"><table class="w-full text-sm text-left"><thead class="bg-blue-50 text-blue-800 uppercase text-[10px] font-bold"><tr><th class="px-3 py-2 border">Month</th><th class="px-3 py-2 border text-center">School Days</th><th class="px-3 py-2 border text-center">Present</th><th class="px-3 py-2 border text-center">Absent</th></tr></thead><tbody>';
        
        let att = window.studentData.attendance_months;
        let months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
        let tDays = 0, tPres = 0, tAbs = 0;
        
        months.forEach(m => {
            let mk = m.toLowerCase();
            let d = att[mk + '_days'] || 0;
            let p = att[mk + '_present'] || 0;
            let a = d - p;
            if (a < 0) a = 0;
            
            if (d > 0) {
                tDays += d; tPres += p; tAbs += a;
                html += \`<tr><td class="px-3 py-2 border font-bold text-gray-700">\${m}</td><td class="px-3 py-2 border text-center">\${d}</td><td class="px-3 py-2 border text-center">\${p}</td><td class="px-3 py-2 border text-center text-red-500">\${a}</td></tr>\`;
            }
        });
        
        if (tDays === 0) {
            html = '<p class="text-gray-500 text-sm">No monthly attendance encoded yet.</p>';
        } else {
            html += \`<tr class="bg-gray-100 font-bold"><td class="px-3 py-2 border">TOTAL</td><td class="px-3 py-2 border text-center">\${tDays}</td><td class="px-3 py-2 border text-center text-green-600">\${tPres}</td><td class="px-3 py-2 border text-center text-red-600">\${tAbs}</td></tr>\`;
            html += '</tbody></table></div>';
        }

        Swal.fire({
            title: '<span class="text-blue-800 font-black">Attendance Record</span>',
            html: html,
            confirmButtonText: 'Close',
            confirmButtonColor: '#3B82F6'
        });
    };
`;

// Insert before the last closing brace/paren of DOMContentLoaded if possible, or just append it.
// The file ends with:
//     // Initialize
// });

content = content.replace('});', functionsToAdd + '\n});');

fs.writeFileSync('public/js/student/dashboard.js', content, 'utf-8');
