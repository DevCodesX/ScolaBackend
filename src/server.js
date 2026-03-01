require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger.config.js');
const { loginLimiter } = require('./middlewares/rateLimit.middleware.js');

// Route imports
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
const coursesRoutes = require('./routes/courses.routes.js');
const subscriptionsRoutes = require('./routes/subscriptions.routes.js');
const teacherInvitationsRoutes = require('./routes/teacherInvitations.routes.js');
const iamRoutes = require('./routes/iam.routes.js');
const teacherStudentInviteRoutes = require('./routes/teacherStudentInvite.routes.js');
const teacherStudentMgmtRoutes = require('./routes/teacherStudentMgmt.routes.js');
const db = require('./config/db.js');

const app = express();

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Disable for Swagger UI
}));

app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:3000", "https://scola.netlify.app"],
    credentials: true,
}));
app.use(express.json());

// Swagger API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Scola API Documentation',
}));

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
app.use("/api/iam", iamRoutes);
app.use("/api/teachers", teachersRoutes);
app.use("/api/institutions", institutionsRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/classes", classesRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/grades", gradesRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/teacher-invitations", teacherInvitationsRoutes);
app.use("/api/teacher-student-invites", teacherStudentInviteRoutes);
app.use("/api/teacher-student-mgmt", teacherStudentMgmtRoutes);

app.listen(process.env.PORT, () => {
    console.log(`Scola API running on port ${process.env.PORT}`);
    console.log(`📚 API Docs: http://localhost:${process.env.PORT}/api-docs`);
});
