const fs = require('fs');
let content = fs.readFileSync('public/js/admin/records.js', 'utf-8');

content = content.replace(
    "let jhsSections = availableSections.filter(sec => !sec.startsWith('11') && !sec.startsWith('12'));",
    "let jhsSections = availableSections.filter(sec => {\n        let match = sec.match(/\\b([7-9]|1[0-2])\\b/);\n        return match && parseInt(match[1]) <= 10;\n    });"
);

content = content.replace(
    "let shsSections = availableSections.filter(sec => sec.startsWith('11') || sec.startsWith('12'));",
    "let shsSections = availableSections.filter(sec => {\n        let match = sec.match(/\\b([7-9]|1[0-2])\\b/);\n        if (match && parseInt(match[1]) >= 11) {\n            const myTeacherRec = teachers.find(t => t.id === currentUser.id);\n            const myStrand = myTeacherRec ? (myTeacherRec.strand || currentUser.strand) : null;\n            if (myStrand) {\n                try {\n                    let saved = JSON.parse(localStorage.getItem('cnhs_sections') || '[]');\n                    let sd = saved.find(x => x.name === sec);\n                    if (sd && sd.strand && sd.strand !== myStrand) return false;\n                } catch(e) {}\n            }\n            return true;\n        }\n        return false;\n    });"
);

content = content.replace(
    "const myLevel = myTeacherRec ? (myTeacherRec.level || 'JH') : 'JH';",
    "const myLevel = myTeacherRec ? (myTeacherRec.level || currentUser.level || 'JH') : (currentUser.level || 'JH');"
);

fs.writeFileSync('public/js/admin/records.js', content, 'utf-8');
console.log('Fixed records.js');
