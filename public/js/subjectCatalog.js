/**
 * subjectCatalog.js — CNHS Subject Catalog
 * Central subject list for Junior High (Grade 7–10) and
 * Senior High (Academic, TechPro) by grade & semester.
 *
 * Semester 1 = Q1 + Q2 | Semester 2 = Q3 + Q4
 * Use getSubjectsForReport(level, strand, grade, semester) to retrieve the list.
 */

const SUBJECT_CATALOG = {

    // ─── JUNIOR HIGH (Grade 7–10) ─────────────────────────────
    JH: {
        subjects: [
            'Science',
            'Mathematics',
            'English',
            'Filipino',
            'Araling Panlipunan',
            'Edukasyon sa Pagpapakatao',
            'MAPEH',
            'Technology and Livelihood Education',
        ],
        7: { subjects: ['Science', 'Mathematics', 'English', 'Filipino', 'Araling Panlipunan', 'Edukasyon sa Pagpapakatao', 'MAPEH', 'Technology and Livelihood Education'] },
        8: { subjects: ['Science', 'Mathematics', 'English', 'Filipino', 'Araling Panlipunan', 'Edukasyon sa Pagpapakatao', 'MAPEH', 'Technology and Livelihood Education'] },
        9: { subjects: ['Science', 'Mathematics', 'English', 'Filipino', 'Araling Panlipunan', 'Edukasyon sa Pagpapakatao', 'MAPEH', 'Technology and Livelihood Education'] },
        10: { subjects: ['Science', 'Mathematics', 'English', 'Filipino', 'Araling Panlipunan', 'Edukasyon sa Pagpapakatao', 'MAPEH', 'Technology and Livelihood Education'] },
        // JH has no strand distinction; sem1/sem2 same subjects
    },

    // ─── SENIOR HIGH ─────────────────────────────────────────────────────────
    SH: {

        Academic: {
            11: {
                sem1: [ // Q1 & Q2
                    'Oral Communication',
                    'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino',
                    'General Mathematics',
                    'Earth and Life Sciences',
                    '21st Century Literature from the Philippines and the World',
                    'Physical Education and Health',
                    'Empowerment Technologies',
                    'Filipino sa Piling Larang',
                    'Pre-Calculus',
                    'Organization and Management',
                ],
                sem2: [ // Q3 & Q4
                    'Reading and Writing Skills',
                    "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik",
                    'Statistics and Probability',
                    'Physical Science',
                    'Personal Development',
                    'Physical Education and Health',
                    'Basic Calculus',
                    'Practical Research 1',
                    'Fundamentals of Accountancy, Business and Management 1',
                ],
            },
            12: {
                sem1: [ // Q1 & Q2
                    'Introduction to the Philosophy of the Human Person',
                    'Contemporary Philippine Arts from the Regions',
                    'Understanding Culture, Society and Politics',
                    'Physical Education and Health',
                    'English for Academic and Professional Purposes',
                    'Practical Research 2',
                    'General Physics 1',
                    'Applied Economics',
                ],
                sem2: [ // Q3 & Q4
                    'Media and Information Literacy',
                    'Physical Education and Health',
                    'Inquiries, Investigations and Immersion',
                    'General Physics 2',
                    'Business Enterprise Simulation / Work Immersion',
                ],
            },
        },

        TechPro: {
            11: {
                sem1: [ // Q1 & Q2
                    'Oral Communication',
                    'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino',
                    'General Mathematics',
                    'Earth and Life Sciences',
                    '21st Century Literature from the Philippines and the World',
                    'Physical Education and Health',
                    'Empowerment Technologies',
                    'Technical Drafting 1',
                    'Computer Systems Servicing 1',
                ],
                sem2: [ // Q3 & Q4
                    'Reading and Writing Skills',
                    "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik",
                    'Statistics and Probability',
                    'Physical Science',
                    'Personal Development',
                    'Physical Education and Health',
                    'Technical Drafting 2',
                    'Computer Systems Servicing 2',
                ],
            },
            12: {
                sem1: [ // Q1 & Q2
                    'Introduction to the Philosophy of the Human Person',
                    'Contemporary Philippine Arts from the Regions',
                    'Understanding Culture, Society and Politics',
                    'Physical Education and Health',
                    'English for Academic and Professional Purposes',
                    'Practical Research 2',
                    'Food and Beverage Services',
                ],
                sem2: [ // Q3 & Q4
                    'Media and Information Literacy',
                    'Physical Education and Health',
                    'Inquiries, Investigations and Immersion',
                    'Work Immersion',
                ],
            },
        },
    }
};

/**
 * Get subjects for the academic report based on selection.
 * @param {string} level     - 'JH' or 'SH'
 * @param {string} strand    - 'Academic', 'TechPro' (only for SH)
 * @param {number} grade     - 7-12
 * @param {number} semester  - 1 or 2
 * @returns {string[]}  Array of subject names
 */
function getSubjectsForReport(level, strand, grade, semester) {
    if (level === 'JH') {
        if (SUBJECT_CATALOG.JH[grade]) {
            return SUBJECT_CATALOG.JH[grade].subjects;
        }
        return SUBJECT_CATALOG.JH.subjects;
    }

    if (level === 'SH' && strand && SUBJECT_CATALOG.SH[strand]) {
        const gradeData = SUBJECT_CATALOG.SH[strand][grade];
        if (gradeData) {
            // Under the new 3-Term (Trimester) system, SHS subjects are taught across the academic year.
            return [...(gradeData.sem1 || []), ...(gradeData.sem2 || [])];
        }
    }
    return [];
}

/**
 * Get JHS or SHS pre-defined subjects array (legacy helper)
 * @param {string} key   - e.g. 'JH_7', 'SH_Academic_11_sem1'
 * @returns {string[]}
 */
function getSubjectsByKey(key) {
    if (key.startsWith('JH_')) {
        const g = key.split('_')[1];
        if (SUBJECT_CATALOG.JH[g]) return SUBJECT_CATALOG.JH[g].subjects;
        return SUBJECT_CATALOG.JH.subjects;
    }
    // Expected: SH_Academic_11_sem1
    if (key.startsWith('SH_')) {
        const parts = key.split('_');
        if (parts.length === 4) {
            const s = parts[1];
            const g = parseInt(parts[2]);
            const sem = parts[3]; // sem1 or sem2
            if (SUBJECT_CATALOG.SH[s] && SUBJECT_CATALOG.SH[s][g]) {
                return SUBJECT_CATALOG.SH[s][g][sem] || [];
            }
        }
    }
    return [];
}

/**
 * Returns all unique strands in SH.
 */
const SH_STRANDS = ['Academic', 'TechPro'];
const JH_GRADES = [7, 8, 9, 10];
const SH_GRADES = [11, 12];

if (typeof window !== 'undefined') {
    window.SUBJECT_CATALOG = SUBJECT_CATALOG;
    window.SH_STRANDS = SH_STRANDS;
    window.JH_GRADES = JH_GRADES;
    window.SH_GRADES = SH_GRADES;
    window.getSubjectsForReport = getSubjectsForReport;
    window.getSubjectsByKey = getSubjectsByKey;
}
