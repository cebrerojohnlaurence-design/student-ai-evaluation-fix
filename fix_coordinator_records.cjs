const fs = require('fs');
let content = fs.readFileSync('public/js/admin/records.js', 'utf-8');

const target1 = `    let teacherStudents = students;
    if (currentUser.role === 'teacher') {
        const allowed = Array.from(new Set([...(currentUser.handledSections || []), ...(typeof pinnedSections !== 'undefined' ? pinnedSections : [])]));
        if (allowed.length > 0) {
            teacherStudents = students.filter(s => allowed.includes(s.section));
        } else {
            teacherStudents = [];
        }
    }`;

const replace1 = `    let teacherStudents = students;
    if (currentUser.role === 'teacher') {
        const allowed = Array.from(new Set([...(currentUser.handledSections || []), ...(typeof pinnedSections !== 'undefined' ? pinnedSections : [])]));
        if (allowed.length > 0) {
            teacherStudents = students.filter(s => allowed.includes(s.section));
        } else {
            teacherStudents = [];
        }
    } else if (currentUser.role === 'curriculum_coordinator') {
        if (currentUser.department === 'JHS') {
            teacherStudents = students.filter(s => {
                if (!s.section) return !s.strand;
                const match = s.section.match(/\\b([7-9]|1[0-2])\\b/);
                if (match) return parseInt(match[1]) <= 10;
                try {
                    const savedSections = JSON.parse(localStorage.getItem('cnhs_sections') || '[]');
                    const secData = savedSections.find(x => x.name === s.section);
                    if (secData && secData.year) {
                        const m = secData.year.match(/\\b([7-9]|1[0-2])\\b/);
                        if (m) return parseInt(m[1]) <= 10;
                    }
                } catch(e) {}
                return false;
            });
        } else if (currentUser.department === 'SHS') {
            teacherStudents = students.filter(s => {
                if (!s.section) {
                    if (s.strand) return (!currentUser.strand || s.strand === currentUser.strand);
                    return !currentUser.strand;
                }
                const match = s.section.match(/\\b([7-9]|1[0-2])\\b/);
                let isSHS = false;
                if (match) {
                    if (parseInt(match[1]) >= 11) isSHS = true;
                    else return false;
                } else {
                    try {
                        const savedSections = JSON.parse(localStorage.getItem('cnhs_sections') || '[]');
                        const secData = savedSections.find(x => x.name === s.section);
                        if (secData && secData.year) {
                            const m = secData.year.match(/\\b([7-9]|1[0-2])\\b/);
                            if (m) {
                                if (parseInt(m[1]) >= 11) isSHS = true;
                                else return false;
                            }
                        }
                    } catch(e) {}
                }
                if (isSHS && currentUser.strand) {
                    if (s.strand && s.strand !== currentUser.strand) return false;
                    try {
                        const savedSections = JSON.parse(localStorage.getItem('cnhs_sections') || '[]');
                        const secData = savedSections.find(x => x.name === s.section);
                        if (secData && secData.strand && secData.strand !== currentUser.strand) return false;
                    } catch(e) {}
                }
                return isSHS;
            });
        }
    }`;

content = content.replace(target1, replace1);

const target2 = `    const yearSections = sectionsData.filter(s => !s.schoolYear || s.schoolYear === (window.currentRecordSchoolYear || '2025-2026')).map(s => s.name);`;

const replace2 = `    let yearSectionsData = sectionsData.filter(s => !s.schoolYear || s.schoolYear === (window.currentRecordSchoolYear || '2025-2026'));
    if (currentUser.role === 'curriculum_coordinator') {
        if (currentUser.department === 'JHS') {
            yearSectionsData = yearSectionsData.filter(s => {
                const match = (s.year || s.name).match(/\\b([7-9]|1[0-2])\\b/);
                return match && parseInt(match[1]) <= 10;
            });
        } else if (currentUser.department === 'SHS') {
            yearSectionsData = yearSectionsData.filter(s => {
                const match = (s.year || s.name).match(/\\b([7-9]|1[0-2])\\b/);
                if (match && parseInt(match[1]) >= 11) {
                    if (currentUser.strand && s.strand !== currentUser.strand) return false;
                    return true;
                }
                return false;
            });
        }
    }
    const yearSections = yearSectionsData.map(s => s.name);`;

content = content.replace(target2, replace2);

fs.writeFileSync('public/js/admin/records.js', content, 'utf-8');
