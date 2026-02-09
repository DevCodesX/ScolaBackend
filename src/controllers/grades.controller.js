const db = require('../db.js');
const { v4: uuid } = require('uuid');

// Add a grade
const addGrade = async (req, res) => {
    const { student_id, class_id, grade_type, score, max_score } = req.body;

    try {
        const id = uuid();
        await db.query(
            `INSERT INTO grades (id, student_id, class_id, grade_type, score, max_score)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, student_id, class_id, grade_type, score, max_score]
        );
        res.status(201).json({ id, student_id, class_id, grade_type, score, max_score });
    } catch (err) {
        console.error('Add grade error:', err);
        res.status(500).json({ message: 'Failed to add grade' });
    }
};

// Add bulk grades (multiple students at once)
const addBulkGrades = async (req, res) => {
    const { class_id, grade_type, max_score, records } = req.body;
    // records = [{ student_id, score }, ...]

    try {
        for (const record of records) {
            const id = uuid();
            await db.query(
                `INSERT INTO grades (id, student_id, class_id, grade_type, score, max_score)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [id, record.student_id, class_id, grade_type, record.score, max_score]
            );
        }
        res.status(201).json({ success: true, count: records.length });
    } catch (err) {
        console.error('Bulk grades error:', err);
        res.status(500).json({ message: 'Failed to save grades' });
    }
};

// Get all grades for a class
const getClassGrades = async (req, res) => {
    const { classId } = req.params;

    try {
        const [rows] = await db.query(
            `SELECT g.id, g.grade_type, g.score, g.max_score, g.created_at,
                    s.id as student_id, s.name as student_name
             FROM grades g
             JOIN students s ON s.id = g.student_id
             WHERE g.class_id = ?
             ORDER BY g.created_at DESC`,
            [classId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Get grades error:', err);
        res.status(500).json({ message: 'Failed to fetch grades' });
    }
};

// Get grades summary for a class (average per student)
const getGradesSummary = async (req, res) => {
    const { classId } = req.params;

    try {
        const [rows] = await db.query(
            `SELECT 
                s.id, s.name,
                COUNT(g.id) as total_grades,
                ROUND(AVG(g.score / g.max_score * 100), 1) as average_percentage
             FROM students s
             JOIN student_classes sc ON sc.student_id = s.id
             LEFT JOIN grades g ON g.student_id = s.id AND g.class_id = ?
             WHERE sc.class_id = ?
             GROUP BY s.id, s.name
             ORDER BY s.name`,
            [classId, classId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Grades summary error:', err);
        res.status(500).json({ message: 'Failed to fetch summary' });
    }
};

// Update a grade
const updateGrade = async (req, res) => {
    const { id } = req.params;
    const { score, max_score, grade_type } = req.body;

    try {
        await db.query(
            `UPDATE grades SET score = ?, max_score = ?, grade_type = ? WHERE id = ?`,
            [score, max_score, grade_type, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Update grade error:', err);
        res.status(500).json({ message: 'Failed to update grade' });
    }
};

// Delete a grade
const deleteGrade = async (req, res) => {
    const { id } = req.params;

    try {
        await db.query('DELETE FROM grades WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete grade error:', err);
        res.status(500).json({ message: 'Failed to delete grade' });
    }
};

module.exports = {
    addGrade,
    addBulkGrades,
    getClassGrades,
    getGradesSummary,
    updateGrade,
    deleteGrade
};
