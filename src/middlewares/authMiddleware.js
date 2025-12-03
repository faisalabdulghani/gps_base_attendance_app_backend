const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    try {
        const auth = req.header("Authorization");
        if (!auth) return res.status(401).json({ message: "No token provided" });

        const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
        req.user = { id: decoded.id, role: decoded.role };
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
};
