// src/scheduler/autoAbsent.js
const cron = require("node-cron");
const moment = require("moment");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");

/**
 * Run at 23:59 every day to mark absent users (who neither checked in nor have approved leave)
 */
function startAutoAbsentJob() {
    // Cron pattern: minute hour day month weekday
    cron.schedule("59 23 * * *", async () => {
        try {
            console.log("AutoAbsent job running:", new Date().toISOString());
            const today = moment().format("YYYY-MM-DD");

            const users = await User.find({}, "_id");

            for (const u of users) {
                // Skip if attendance exists (present or leave)
                const att = await Attendance.findOne({ user: u._id, date: today });
                if (att) continue;

                // Skip if approved leave exists
                const leave = await Leave.findOne({ user: u._id, date: today, status: "approved" });
                if (leave) continue;

                // Create absent record
                await Attendance.create({
                    user: u._id,
                    date: today,
                    status: "absent"
                });

                console.log(`Marked absent: user ${u._id} date ${today}`);
            }

            console.log("AutoAbsent job completed.");
        } catch (err) {
            console.error("AutoAbsent job error:", err);
        }
    }, {
        timezone: "Asia/Karachi" // optional: set timezone
    });
}

module.exports = { startAutoAbsentJob };
