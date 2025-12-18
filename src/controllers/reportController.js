const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const {
    getTodayDatePKT,
    startOfDayPKT,
    endOfDayPKT
} = require("../utils/time");

/**
 * ======================
 * TODAY REPORT
 * ======================
 * Returns:
 * - check-in
 * - check-out
 * - working hours
 * - status
 */
exports.getTodayReport = async (req, res) => {
    try {
        const userId = req.user.id;
        const todayPKT = getTodayDatePKT();

        const attendance = await Attendance.findOne({
            user: userId,
            date: todayPKT
        }).lean();

        if (!attendance) {
            return res.json({
                date: todayPKT,
                status: "absent",
                checkInTime: null,
                checkOutTime: null,
                workingHours: 0,
                isLate: false,
                halfDay: false
            });
        }

        return res.json({
            date: attendance.date,
            status: attendance.status,
            checkInTime: attendance.checkInTime,
            checkOutTime: attendance.checkOutTime,
            workingHours: attendance.workDurationHours || 0,
            isLate: attendance.isLate,
            halfDay: attendance.halfDay
        });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

/**
 * ======================
 * SUMMARY REPORT
 * (Monthly + Weekly auto)
 * ======================
 */
exports.getSummaryReport = async (req, res) => {
    try {
        const userId = req.user.id;

        // Default → current month/year
        const now = new Date();
        const month = req.query.month || String(now.getMonth() + 1).padStart(2, "0");
        const year = req.query.year || now.getFullYear();

        const monthStart = startOfDayPKT(`${year}-${month}-01`);
        const monthEnd = endOfDayPKT(
            `${year}-${month}-${new Date(year, month, 0).getDate()}`
        );

        const response = {
            month: `${year}-${month}`,
            counts: {
                present: 0,
                late: 0,
                absent: 0,
                leave: 0,
                earlyOuts: 0
            },
            workingHours: {
                weekly: 0,
                monthly: 0
            }
        };

        /**
         * ======================
         * MONTHLY ATTENDANCE
         * ======================
         */
        const attendance = await Attendance.find({
            user: userId,
            date: { $regex: `^${year}-${month}` }
        }).lean();

        attendance.forEach(a => {
            if (a.status === "present") response.counts.present++;
            if (a.status === "absent") response.counts.absent++;
            if (a.isLate) response.counts.late++;
            if (a.halfDay) response.counts.earlyOuts++;

            response.workingHours.monthly += a.workDurationHours || 0;
        });

        /**
         * ======================
         * MONTHLY LEAVES
         * ======================
         */
        const leaves = await Leave.find({
            user: userId,
            status: "approved",
            startDate: { $lte: monthEnd },
            endDate: { $gte: monthStart }
        });

        response.counts.leave = leaves.length;

        /**
         * ======================
         * CURRENT WEEK HOURS (MON → TODAY)
         * ======================
         */
        const todayPKT = getTodayDatePKT();

        const today = new Date();
        const day = today.getDay(); // Sun = 0
        const diff = day === 0 ? -6 : 1 - day;

        const weekStart = new Date();
        weekStart.setDate(today.getDate() + diff);

        const weekStartDate = weekStart.toISOString().slice(0, 10);

        const weeklyAttendance = await Attendance.find({
            user: userId,
            date: {
                $gte: weekStartDate,
                $lte: todayPKT
            },
            checkInTime: { $ne: null },
            checkOutTime: { $ne: null }
        }).lean();

        weeklyAttendance.forEach(a => {
            response.workingHours.weekly += a.workDurationHours || 0;
        });

        // Round hours
        response.workingHours.weekly = Number(
            response.workingHours.weekly.toFixed(2)
        );
        response.workingHours.monthly = Number(
            response.workingHours.monthly.toFixed(2)
        );

        return res.json(response);

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};
