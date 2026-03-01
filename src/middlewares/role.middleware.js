const requireRole = (role) => {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
        }
        next();
    };
};

// Allow multiple roles
const requireOneOfRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
        }
        next();
    };
};

// Check teacher type (free or institution)
const requireTeacherType = (...types) => {
    return (req, res, next) => {
        if (!types.includes(req.user.teacherType)) {
            return res.status(403).json({ message: "Forbidden - Wrong teacher type" });
        }
        next();
    };
};

module.exports = { requireRole, requireOneOfRoles, requireTeacherType };

