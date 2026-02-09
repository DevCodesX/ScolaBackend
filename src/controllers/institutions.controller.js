const db = require('../db.js');
const { v4: uuid } = require('uuid');

const getInstitutions = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM institutions ORDER BY created_at DESC");
        res.json(rows);
    } catch (err) {
        console.error("Error fetching institutions:", err);
        res.status(500).json({ error: err.message });
    }
};

const createInstitution = async (req, res) => {
    try {
        const { name } = req.body;
        const id = uuid();

        await db.query(
            "INSERT INTO institutions (id, name) VALUES (?, ?)",
            [id, name]
        );

        res.status(201).json({ id, name });
    } catch (err) {
        console.error("Error creating institution:", err);
        res.status(500).json({ error: err.message });
    }
};

const deleteInstitution = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("DELETE FROM institutions WHERE id = ?", [id]);
        res.sendStatus(204);
    } catch (err) {
        console.error("Error deleting institution:", err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getInstitutions,
    createInstitution,
    deleteInstitution
};
