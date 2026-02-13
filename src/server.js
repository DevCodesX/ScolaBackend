require('dotenv').config();

const express = require('express');
const cors = require('cors');
const teachersRoutes = require('./routes/teachers.routes.js');
const institutionsRoutes = require('./routes/institutions.routes.js');
const authRoutes = require('./routes/auth.routes.js');
const studentsRoutes = require('./routes/students.routes.js');
const classesRoutes = require('./routes/classes.routes.js');
const teacherRoutes = require('./routes/teacher.routes.js');
const attendanceRoutes = require('./routes/attendance.routes.js');
const gradesRoutes = require('./routes/grades.routes.js');
const timetableRoutes = require('./routes/timetable.routes.js');
const adminRoutes = require('./routes/admin.routes.js');
const db = require('./db.js');

const app = express();

app.use(cors());
app.use(express.json());

// Health check route
app.get("/", (req, res) => {
    res.json({ status: "OK", message: "Scola Backend API is running" });
});

// Database connection test route
app.get("/api/test-db", async (req, res) => {
    try {
        await db.query("SELECT 1");
        res.json({ message: "Database connected ✅" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/teachers", teachersRoutes);
app.use("/api/institutions", institutionsRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/classes", classesRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/grades", gradesRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/admin", adminRoutes);

app.listen(process.env.PORT, () => {
    console.log(`Scola API running on port ${process.env.PORT}`);
});
