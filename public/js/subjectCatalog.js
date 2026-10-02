/**
 * subjectCatalog.js — CNHS Subject Catalog
 * Central subject list for Junior High (Grade 7–10) and
 * Senior High (Academic, TechPro) by grade & TERM (Trimester).
 *
 * SHS follows TRIMESTER system per DepEd Order 015 s. 2026:
 *   Term 1: June – September
 *   Term 2: September – December
 *   Term 3: January – April
 *
 * Use getSubjectsForReport(level, strand, grade, term) to retrieve the list.
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
    },

    // ─── SENIOR HIGH ─────────────────────────────────────────────────────────
    // Trimester system: Term 1, Term 2, Term 3
    // Based on DepEd Order 015 s. 2026 (Strengthened Senior High School)
    SH: {

        // ── ACADEMIC TRACK ──────────────────────────────────────────────────
        Academic: {
            11: {
                term1: [
                    'Oral Communication in Context',
                    'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino',
                    'General Mathematics',
                    'Earth and Life Science',
                    'Personal Development',
                    'Physical Education and Health 1',
                    // Elective (STEM default — coordinator can edit)
                    'Pre-Calculus',
                ],
                term2: [
                    'Reading and Writing Skills',
                    "Pagbasa at Pagsusuri ng Iba't Ibang Teksto sa Pananaliksik",
                    'Statistics and Probability',
                    'Physical Science',
                    'Physical Education and Health 2',
                    // Elective
                    'Basic Calculus',
                    'Practical Research 1',
                ],
                term3: [
                    '21st Century Literature from the Philippines and the World',
                    'Contemporary Philippine Arts from the Regions',
                    'Media and Information Literacy',
                    'Physical Education and Health 3',
                    // Elective
                    'General Biology 1',
                    'Empowerment Technologies',
                ],
            },
            12: {
                term1: [
                    'Introduction to the Philosophy of the Human Person',
                    'Understanding Culture, Society and Politics',
                    'Physical Education and Health 4',
                    // Elective
                    'General Physics 1',
                    'Practical Research 2',
                    'English for Academic and Professional Purposes',
                ],
                term2: [
                    'Disaster Readiness and Risk Reduction',
                    'Physical Education and Health 4',
                    // Elective
                    'General Physics 2',
                    'Inquiries, Investigations and Immersion',
                    'Applied Economics',
                ],
                term3: [
                    'Community Engagement, Solidarity, and Citizenship',
                    // Elective
                    'General Chemistry 1',
                    'Work Immersion',
                ],
            },
        },

        // ── TECH-PRO (TVL) TRACK ─────────────────────────────────────────────
        TechPro: {
            11: {
                term1: [
                    'Oral Communication in Context',
                    'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino',
                    'General Mathematics',
                    'Earth and Life Science',
                    'Personal Development',
                    'Physical Education and Health 1',
                    // Specialization (ICT default — coordinator can edit)
                    'Computer Systems Servicing NC II (Part 1)',
                    'Empowerment Technologies',
                ],
                term2: [
                    'Reading and Writing Skills',
                    "Pagbasa at Pagsusuri ng Iba't Ibang Teksto sa Pananaliksik",
                    'Statistics and Probability',
                    'Physical Science',
                    'Physical Education and Health 2',
                    // Specialization
                    'Computer Systems Servicing NC II (Part 2)',
                    'Practical Research 1',
                ],
                term3: [
                    '21st Century Literature from the Philippines and the World',
                    'Contemporary Philippine Arts from the Regions',
                    'Media and Information Literacy',
                    'Physical Education and Health 3',
                    // Specialization
                    'Bread and Pastry Production NC II',
                ],
            },
            12: {
                term1: [
                    'Introduction to the Philosophy of the Human Person',
                    'Understanding Culture, Society and Politics',
                    'Physical Education and Health 4',
                    // Specialization
                    'Computer Programming NC III (Part 1)',
                    'Entrepreneurship',
                    'English for Academic and Professional Purposes',
                ],
                term2: [
                    'Disaster Readiness and Risk Reduction',
                    // Specialization
                    'Computer Programming NC III (Part 2)',
                    'Inquiries, Investigations and Immersion',
                ],
                term3: [
                    'Community Engagement, Solidarity, and Citizenship',
                    // Specialization
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
 * @param {number} term      - For SH: 1, 2, or 3 (trimester). For JH: not used.
 * @returns {string[]}  Array of subject names
 */
function getSubjectsForReport(level, strand, grade, term) {
    if (level === 'JH') {
        if (SUBJECT_CATALOG.JH[grade]) {
            return SUBJECT_CATALOG.JH[grade].subjects;
        }
        return SUBJECT_CATALOG.JH.subjects;
    }

    if (level === 'SH' && strand && SUBJECT_CATALOG.SH[strand]) {
        const gradeData = SUBJECT_CATALOG.SH[strand][grade];
        if (gradeData) {
            const termKey = 'term' + (term || 1);
            // If specific term requested, return that term's subjects
            if (gradeData[termKey]) return gradeData[termKey];
            // Otherwise return ALL subjects across all terms
            return [
                ...(gradeData.term1 || []),
                ...(gradeData.term2 || []),
                ...(gradeData.term3 || []),
            ];
        }
    }
    return [];
}

/**
 * Get JHS or SHS pre-defined subjects array (legacy helper)
 * @param {string} key   - e.g. 'JH_7', 'SH_Academic_11_term1'
 * @returns {string[]}
 */
function getSubjectsByKey(key) {
    if (key.startsWith('JH_')) {
        const g = key.split('_')[1];
        if (SUBJECT_CATALOG.JH[g]) return SUBJECT_CATALOG.JH[g].subjects;
        return SUBJECT_CATALOG.JH.subjects;
    }

    // SH_Academic_11_term1 or old SH_Academic_11_sem1 format
    const parts = key.split('_');
    if (parts[0] === 'SH' && parts.length >= 4) {
        const strand = parts[1];
        const grade = parseInt(parts[2]);
        const periodKey = parts[3]; // term1/term2/term3 or sem1/sem2 (legacy)
        
        // Map old sem keys to term keys
        const termMap = { sem1: 'term1', sem2: 'term2' };
        const resolvedKey = termMap[periodKey] || periodKey;
        
        if (SUBJECT_CATALOG.SH[strand] && SUBJECT_CATALOG.SH[strand][grade]) {
            return SUBJECT_CATALOG.SH[strand][grade][resolvedKey] || [];
        }
    }
    return [];
}
