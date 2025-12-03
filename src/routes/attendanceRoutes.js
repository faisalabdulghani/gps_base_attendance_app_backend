// src/routes/attendanceRoutes.js
const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");
const allowRoles = require("../middlewares/roleMiddleware");
const {
    markAttendance,
    getMyAttendance,
    getAttendanceByDate
} = require("../controllers/attendanceController");

router.post("/mark", auth, markAttendance);
router.get("/my", auth, getMyAttendance);
router.get("/date/:date", auth, allowRoles("admin"), getAttendanceByDate);

module.exports = router;
