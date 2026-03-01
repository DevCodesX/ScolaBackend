const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Scola API Documentation',
            version: '1.0.0',
            description: 'API documentation for Scola - Educational Institution Management System',
            contact: {
                name: 'Scola Team',
            },
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT || 4000}`,
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                TeacherRegister: {
                    type: 'object',
                    required: ['first_name', 'last_name', 'email', 'password', 'subject'],
                    properties: {
                        first_name: { type: 'string', example: 'أحمد' },
                        last_name: { type: 'string', example: 'محمد' },
                        email: { type: 'string', format: 'email', example: 'ahmed@example.com' },
                        password: { type: 'string', minLength: 6, example: 'securePass123' },
                        qualifications: { type: 'string', example: 'بكالوريوس تربية' },
                        subject: { type: 'string', example: 'الرياضيات' },
                    },
                },
                InstitutionRegister: {
                    type: 'object',
                    required: ['institution_name', 'admin_name', 'admin_email', 'admin_password'],
                    properties: {
                        institution_name: { type: 'string', example: 'مدرسة النور' },
                        admin_name: { type: 'string', example: 'محمد أحمد' },
                        admin_email: { type: 'string', format: 'email', example: 'admin@school.com' },
                        admin_password: { type: 'string', minLength: 6, example: 'securePass123' },
                    },
                },
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string' },
                    },
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        token: { type: 'string' },
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                email: { type: 'string' },
                                role: { type: 'string' },
                                institution_id: { type: 'string' },
                            },
                        },
                    },
                },
                DashboardStats: {
                    type: 'object',
                    properties: {
                        teacherCount: { type: 'integer' },
                        studentCount: { type: 'integer' },
                        teachers: { type: 'array', items: { type: 'object' } },
                        recentStudents: { type: 'array', items: { type: 'object' } },
                    },
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
