const fs = require('fs');

function patchAppJs() {
    const file = 'd:/practice/practice/ai-driven/public/js/app.js';
    let content = fs.readFileSync(file, 'utf8');
    
    // Fix 1: Default to 0 in Student Profile
    content = content.replace(
        /const rec = attRecords\.find\(r => r\.month === m\.m && r\.school_year === sy\) \|\| \{ school_days: m\.d, days_present: m\.d \};/g,
        "const rec = attRecords.find(r => r.month === m.m && r.school_year === sy) || { school_days: 0, days_present: 0 };"
    );
    
    // Fix 2: Default to 0 in Monthly Attendance Modal
    content = content.replace(
        /const rec = existingRecords\.find\(r => r\.month === month && r\.school_year === sy\) \|\| \{ school_days: monthObj\.d, days_present: '' \};/g,
        "const rec = existingRecords.find(r => r.month === month && r.school_year === sy) || { school_days: 0, days_present: '' };"
    );
    
    fs.writeFileSync(file, content);
    console.log("Patched app.js successfully");
}

function patchRecordsJs() {
    const file = 'd:/practice/practice/ai-driven/public/js/admin/records.js';
    let content = fs.readFileSync(file, 'utf8');
    
    // Fix 3: Clear fetched cache after saving bulk attendance
    const target = `        if (res.ok) {
            showMessage("Daily attendance sheet saved successfully!");
            await initAppData();`;
            
    const newCode = `        if (res.ok) {
            showMessage("Daily attendance sheet saved successfully!");
            if (typeof fetchedAttendanceSections !== 'undefined') fetchedAttendanceSections.delete(section);
            await initAppData();`;
            
    if (content.includes(target)) {
        content = content.replace(target, newCode);
        fs.writeFileSync(file, content);
        console.log("Patched records.js successfully");
    } else {
        console.log("Could not find target in records.js");
    }
}

patchAppJs();
patchRecordsJs();
