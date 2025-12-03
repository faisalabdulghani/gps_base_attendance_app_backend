// src/controllers/attendanceController.js
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const getDistance = require("../utils/distance");
const moment = require("moment");

// Helper: parse HH:mm into a moment for today
function momentForToday(hhmm) {
    const [hh, mm] = hhmm.split(":").map(s => parseInt(s, 10));
    return moment().hour(hh).minute(mm).second(0).millisecond(0);
}

exports.markAttendance = async (req, res) => {
    try {
        const userId = req.user.id;
        const { latitude, longitude } = req.body;

        if (typeof latitude !== "number" || typeof longitude !== "number") {
            return res.status(400).json({ message: "latitude and longitude are required as numbers" });
        }

        const officeLat = parseFloat(process.env.OFFICE_LAT);
        const officeLng = parseFloat(process.env.OFFICE_LNG);
        const allowedRadius = parseFloat(process.env.OFFICE_RADIUS || 200);
        const officeStartTime = process.env.OFFICE_START_TIME || "09:00";
        const halfDayCutoff = process.env.HALF_DAY_CUTOFF || "12:00";
        const minFullDayHours = parseFloat(process.env.MIN_FULL_DAY_HOURS || 4);

        // 1) If there's an approved leave for today, block attendance
        const today = new Date().toISOString().split("T")[0];
        const leave = await Leave.findOne({ user: userId, date: today, status: "approved" });
        if (leave) {
            return res.status(400).json({ message: "Cannot mark attendance on approved leave" });
        }

        // 2) Geo-fence check
        const dist = getDistance(latitude, longitude, officeLat, officeLng);
        if (dist > allowedRadius) {
            return res.status(403).json({ message: "You are outside the office area", distance: Math.round(dist) + " m" });
        }

        // 3) Find today's attendance
        let attendance = await Attendance.findOne({ user: userId, date: today });

        // If no record => CHECK-IN
        if (!attendance) {
            const now = moment();
            const officeStart = momentForToday(officeStartTime);
            const halfCutoff = momentForToday(halfDayCutoff);

            const isLate = now.isAfter(officeStart);
            const halfDay = now.isAfter(halfCutoff); // check-in after cutoff is immediate half-day

            attendance = await Attendance.create({
                user: userId,
                date: today,
                checkInTime: now.toDate(),
                checkInLocation: { latitude, longitude },
                status: "present",
                isLate,
                halfDay
            });

            const message = isLate ? (halfDay ? "Checked-in (Half day, Late)" : "Checked-in (Late)") : (halfDay ? "Checked-in (Half day)" : "Check-in successful");
            return res.status(201).json({ message, attendance });
        }

        // If exists but already has checkOutTime -> prevent further actions
        if (attendance.checkOutTime) {
            return res.status(400).json({ message: "Already checked-out today" });
        }

        // CHECK-OUT -> set checkout time & calculate duration and half-day by duration
        const nowOut = moment();
        attendance.checkOutTime = nowOut.toDate();
        attendance.checkOutLocation = { latitude, longitude };

        // Calculate work duration in hours
        if (attendance.checkInTime) {
            const checkInMoment = moment(attendance.checkInTime);
            const durationHours = moment.duration(nowOut.diff(checkInMoment)).asHours();
            attendance.workDurationHours = parseFloat(durationHours.toFixed(2));

            // If duration less than MIN_FULL_DAY_HOURS -> half-day
            if (attendance.workDurationHours < minFullDayHours) {
                attendance.halfDay = true;
            }
        }

        await attendance.save();

        return res.status(200).json({ message: "Check-out successful", attendance });
    } catch (err) {
        console.error("markAttendance error:", err);
        return res.status(500).json({ message: err.message });
    }
};

exports.getMyAttendance = async (req, res) => {
    try {
        const userId = req.user.id;
        const records = await Attendance.find({ user: userId }).sort({ date: -1 });
        res.json(records);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getAttendanceByDate = async (req, res) => {
    try {
        const { date } = req.params;
        const records = await Attendance.find({ date }).populate("user", "name email role");
        res.json(records);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
