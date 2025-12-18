// src/server.js or app.js
const express = require("express");
const connectDB = require("./src/config/db");
const dotenv = require("dotenv");
const cors = require("cors");

// Load environment variables
dotenv.config();
const app = express();

// ✅ MIDDLEWARE MUST COME FIRST (BEFORE ROUTES)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ NOW DEFINE ROUTES (AFTER MIDDLEWARE)
app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/users", require("./src/routes/userRoutes"));
app.use("/api/attendance", require("./src/routes/attendanceRoutes"));
app.use("/api/leave", require("./src/routes/leaveRoutes"));

// Import cron jobs
const { startAutoMarkAbsentJob } = require("./src/cron/autoMarkAbsent");

// Health check route
app.get("/", (req, res) => {
    res.json({
        message: "Attendance System API",
        status: "running",
        timestamp: new Date().toISOString()
    });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

        // Start cron jobs after server starts
        startAutoMarkAbsentJob();
        console.log("⏰ Cron jobs initialized");
    });
};

startServer();

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
    console.error("❌ Unhandled Rejection:", err);
    process.exit(1);
});

module.exports = app;