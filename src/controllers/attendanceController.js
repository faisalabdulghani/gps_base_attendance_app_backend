// src/controllers/attendanceController.js
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const getDistance = require("../utils/distance");

const {
    nowUTC,
    getTodayDatePKT,
    getOfficeStartTimePKT,
    startOfDayPKT,
    endOfDayPKT,
    isValidDateString
} = require("../utils/time");

// ================= MARK ATTENDANCE (CHECK-IN / CHECK-OUT) =================
exports.markAttendance = async (req, res) => {
    try {
        const userId = req.user.id;
        const { latitude, longitude } = req.body;

        // Validate coordinates
        if (typeof latitude !== "number" || typeof longitude !== "number") {
            return res.status(400).json({
                message: "Valid latitude and longitude are required"
            });
        }

        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            return res.status(400).json({
                message: "Invalid coordinate values"
            });
        }

        // Get office configuration
        const officeLat = Number(process.env.OFFICE_LAT);
        const officeLng = Number(process.env.OFFICE_LNG);
        const allowedRadius = Number(process.env.OFFICE_RADIUS || 200);
        const minFullDayHours = Number(process.env.MIN_FULL_DAY_HOURS || 4.5);

        // Validate office coordinates
        if (isNaN(officeLat) || isNaN(officeLng)) {
            return res.status(500).json({
                message: "Office location not configured properly"
            });
        }

        const now = nowUTC();
        const todayPKT = getTodayDatePKT();

        // 1️⃣ Check for approved leave today
        const leave = await Leave.findOne({
            user: userId,
            status: "approved",
            startDate: { $lte: endOfDayPKT() },
            endDate: { $gte: startOfDayPKT() }
        });

        if (leave) {
            return res.status(400).json({
                message: "You are on approved leave today. Cannot mark attendance."
            });
        }

        // 2️⃣ Geo-fencing validation
        const distance = getDistance(latitude, longitude, officeLat, officeLng);
        if (distance > allowedRadius) {
            return res.status(403).json({
                message: "You are outside the office area",
                distance: Math.round(distance),
                allowedRadius: allowedRadius,
                unit: "meters"
            });
        }

        // 3️⃣ Find today's attendance record
        let attendance = await Attendance.findOne({
            user: userId,
            date: todayPKT
        });

        // ================= CHECK-IN =================
        if (!attendance) {
            const officeStart = getOfficeStartTimePKT();
            const isLate = now > officeStart;

            try {
                attendance = await Attendance.create({
                    user: userId,
                    date: todayPKT,
                    status: isLate ? "late" : "present",
                    isLate: isLate,
                    checkInTime: now,
                    checkInLocation: { latitude, longitude }
                });

                return res.status(201).json({
                    success: true,
                    message: isLate ? "Checked in (Late)" : "Check-in successful",
                    attendance: {
                        id: attendance._id,
                        date: attendance.date,
                        checkInTime: attendance.checkInTime,
                        status: attendance.status,
                        isLate: attendance.isLate
                    }
                });
            } catch (error) {
                // Handle duplicate key error
                if (error.code === 11000) {
                    return res.status(400).json({
                        message: "Attendance already marked for today"
                    });
                }
                throw error;
            }
        }

        // ================= CHECK-OUT =================
        if (attendance.checkOutTime) {
            return res.status(400).json({
                message: "You have already checked out today",
                checkOutTime: attendance.checkOutTime
            });
        }

        if (!attendance.checkInTime) {
            return res.status(400).json({
                message: "Cannot check out without checking in first"
            });
        }

        // Update checkout details
        attendance.checkOutTime = now;
        attendance.checkOutLocation = { latitude, longitude };

        // Calculate work duration in hours
        const durationMs = attendance.checkOutTime - attendance.checkInTime;
        const durationHours = durationMs / (1000 * 60 * 60);
        attendance.workDurationHours = Number(durationHours.toFixed(2));

        // Mark as half day if duration is less than minimum
        if (attendance.workDurationHours < minFullDayHours) {
            attendance.halfDay = true;
        }

        await attendance.save();

        return res.status(200).json({
            success: true,
            message: "Check-out successful",
            attendance: {
                id: attendance._id,
                date: attendance.date,
                checkInTime: attendance.checkInTime,
                checkOutTime: attendance.checkOutTime,
                workDurationHours: attendance.workDurationHours,
                halfDay: attendance.halfDay,
                status: attendance.status
            }
        });

    } catch (err) {
        console.error("Attendance Error:", err);
        return res.status(500).json({
            message: "Failed to process attendance",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// ================= GET MY ATTENDANCE RECORDS =================
exports.getMyAttendance = async (req, res) => {
    try {
        const userId = req.user.id;
        const { startDate, endDate, limit = 30, page = 1 } = req.query;

        const query = { user: userId };

        // Add date range filter if provided
        if (startDate && endDate) {
            if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
                return res.status(400).json({
                    message: "Invalid date format. Use YYYY-MM-DD"
                });
            }
            query.date = {
                $gte: startDate,
                $lte: endDate
            };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [records, total] = await Promise.all([
            Attendance.find(query)
                .sort({ date: -1, createdAt: -1 })
                .limit(parseInt(limit))
                .skip(skip)
                .select('-__v')
                .lean(),
            Attendance.countDocuments(query)
        ]);

        return res.status(200).json({
            success: true,
            data: records,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (err) {
        console.error("Get My Attendance Error:", err);
        return res.status(500).json({
            message: "Failed to fetch attendance records",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// ================= GET ATTENDANCE BY DATE (ADMIN) =================
exports.getAttendanceByDate = async (req, res) => {
    try {
        const { date } = req.params;

        // Validate date format
        if (!isValidDateString(date)) {
            return res.status(400).json({
                message: "Invalid date format. Use YYYY-MM-DD"
            });
        }

        // Query by date string (much more reliable)
        const records = await Attendance.find({ date })
            .populate("user", "name email role department")
            .sort({ checkInTime: 1 })
            .select('-__v')
            .lean();

        // Calculate summary statistics
        const summary = {
            total: records.length,
            present: records.filter(r => r.status === 'present').length,
            late: records.filter(r => r.status === 'late' || r.isLate).length,
            halfDay: records.filter(r => r.halfDay).length,
            absent: 0 // You might want to calculate this based on total employees
        };

        return res.status(200).json({
            success: true,
            date,
            summary,
            data: records
        });

    } catch (err) {
        console.error("Get Attendance By Date Error:", err);
        return res.status(500).json({
            message: "Failed to fetch attendance records",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// ================= GET ATTENDANCE BY USER (ADMIN) =================
exports.getAttendanceByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate, limit = 30, page = 1 } = req.query;

        const query = { user: userId };

        // Add date range filter if provided
        if (startDate && endDate) {
            if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
                return res.status(400).json({
                    message: "Invalid date format. Use YYYY-MM-DD"
                });
            }
            query.date = {
                $gte: startDate,
                $lte: endDate
            };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [records, total] = await Promise.all([
            Attendance.find(query)
                .populate("user", "name email role department")
                .sort({ date: -1 })
                .limit(parseInt(limit))
                .skip(skip)
                .select('-__v')
                .lean(),
            Attendance.countDocuments(query)
        ]);

        return res.status(200).json({
            success: true,
            data: records,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (err) {
        console.error("Get Attendance By User Error:", err);
        return res.status(500).json({
            message: "Failed to fetch attendance records",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// ================= UPDATE ATTENDANCE (ADMIN) =================
exports.updateAttendance = async (req, res) => {
    try {
        const { attendanceId } = req.params;
        const updates = req.body;

        // Prevent updating certain fields
        const allowedUpdates = ['status', 'isLate', 'halfDay', 'workDurationHours'];
        const updateKeys = Object.keys(updates);
        const isValidUpdate = updateKeys.every(key => allowedUpdates.includes(key));

        if (!isValidUpdate) {
            return res.status(400).json({
                message: "Invalid update fields",
                allowedFields: allowedUpdates
            });
        }

        const attendance = await Attendance.findByIdAndUpdate(
            attendanceId,
            updates,
            { new: true, runValidators: true }
        ).populate("user", "name email role");

        if (!attendance) {
            return res.status(404).json({
                message: "Attendance record not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Attendance updated successfully",
            data: attendance
        });

    } catch (err) {
        console.error("Update Attendance Error:", err);
        return res.status(500).json({
            message: "Failed to update attendance",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// ================= DELETE ATTENDANCE (ADMIN) =================
exports.deleteAttendance = async (req, res) => {
    try {
        const { attendanceId } = req.params;

        const attendance = await Attendance.findByIdAndDelete(attendanceId);

        if (!attendance) {
            return res.status(404).json({
                message: "Attendance record not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Attendance record deleted successfully"
        });

    } catch (err) {
        console.error("Delete Attendance Error:", err);
        return res.status(500).json({
            message: "Failed to delete attendance",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};