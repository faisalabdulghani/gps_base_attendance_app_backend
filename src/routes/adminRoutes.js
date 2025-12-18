// src/routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");
const { runManualAbsentCheck } = require("../cron/autoMarkAbsent");

/**
 * Manual trigger to mark absent users
 * Useful for testing or running manually
 * POST /api/admin/mark-absent
 */
router.post("/mark-absent", protect, authorize("admin"), async (req, res) => {
    try {
        await runManualAbsentCheck();

        res.status(200).json({
            success: true,
            message: "Absent marking process completed successfully"
        });
    } catch (error) {
        console.error("Error marking absent:", error);
        res.status(500).json({
            success: false,
            message: "Failed to mark absent users",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;