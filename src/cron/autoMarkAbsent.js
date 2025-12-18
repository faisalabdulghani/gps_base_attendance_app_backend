// src/cron/autoMarkAbsent.js
const cron = require("node-cron");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const { getTodayDatePKT, startOfDayPKT, endOfDayPKT } = require("../utils/time");

/**
 * Auto mark absent for users who didn't check in
 * Runs daily at 8:10 PM PKT
 */
const autoMarkAbsent = async () => {
    try {
        console.log("🔄 Running auto-mark absent job at 8:10 PM PKT...");

        const todayPKT = getTodayDatePKT();
        const startOfDay = startOfDayPKT();
        const endOfDay = endOfDayPKT();

        // 1️⃣ Get all active employees
        const allUsers = await User.find({
            status: "active",
            role: { $in: ["employee", "hr"] } // Exclude admin if needed
        }).select("_id");

        const allUserIds = allUsers.map(user => user._id.toString());
        console.log(`📊 Total active users: ${allUserIds.length}`);

        // 2️⃣ Get users who already marked attendance today
        const attendedUsers = await Attendance.find({
            date: todayPKT
        }).distinct("user");

        const attendedUserIds = attendedUsers.map(id => id.toString());
        console.log(`✅ Users who marked attendance: ${attendedUserIds.length}`);

        // 3️⃣ Get users who are on approved leave today
        const usersOnLeave = await Leave.find({
            status: "approved",
            startDate: { $lte: endOfDay },
            endDate: { $gte: startOfDay }
        }).distinct("user");

        const leaveUserIds = usersOnLeave.map(id => id.toString());
        console.log(`🏖️ Users on approved leave: ${leaveUserIds.length}`);

        // 4️⃣ Find users who are absent (didn't mark attendance and not on leave)
        const absentUserIds = allUserIds.filter(userId =>
            !attendedUserIds.includes(userId) && !leaveUserIds.includes(userId)
        );

        console.log(`❌ Users to mark absent: ${absentUserIds.length}`);

        // 5️⃣ Create absent records
        if (absentUserIds.length > 0) {
            const absentRecords = absentUserIds.map(userId => ({
                user: userId,
                date: todayPKT,
                status: "absent",
                isLate: false,
                halfDay: false,
                workDurationHours: 0,
                checkInTime: null,
                checkOutTime: null
            }));

            // Use insertMany to create all absent records at once
            const result = await Attendance.insertMany(absentRecords, {
                ordered: false // Continue even if some fail due to duplicates
            });

            console.log(`✅ Successfully marked ${result.length} users as absent`);
        } else {
            console.log("✅ No users to mark absent today");
        }

        console.log("🎉 Auto-mark absent job completed successfully");

    } catch (error) {
        // Handle duplicate key errors gracefully
        if (error.code === 11000) {
            console.log("⚠️ Some users already had attendance records (duplicates ignored)");
        } else {
            console.error("❌ Error in auto-mark absent job:", error);
        }
    }
};

/**
 * Schedule cron job to run daily at 8:10 PM PKT
 * Cron format: minute hour day month weekday
 * "10 20 * * *" = At 20:10 (8:10 PM) every day
 * 
 * Note: Server should be running in UTC, cron runs in server timezone
 * PKT is UTC+5, so 8:10 PM PKT = 3:10 PM UTC
 * Adjust the cron time based on your server's timezone
 */
const startAutoMarkAbsentJob = () => {
    // If your server is in UTC, use "10 15 * * *" (3:10 PM UTC = 8:10 PM PKT)
    // If your server is in PKT, use "10 20 * * *" (8:10 PM PKT)

    // For UTC server (most common for cloud servers):
    cron.schedule("10 15 * * *", async () => {
        console.log("\n⏰ Cron job triggered at 8:10 PM PKT");
        await autoMarkAbsent();
    }, {
        timezone: "UTC"
    });

    console.log("✅ Auto-mark absent cron job scheduled for 8:10 PM PKT (3:10 PM UTC) daily");
};

// Manual trigger function for testing
const runManualAbsentCheck = async () => {
    console.log("🔧 Manual trigger: Running absent check now...");
    await autoMarkAbsent();
};

module.exports = {
    startAutoMarkAbsentJob,
    runManualAbsentCheck,
    autoMarkAbsent
};