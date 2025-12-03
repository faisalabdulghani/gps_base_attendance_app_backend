// src/models/Attendance.js
const mongoose = require("mongoose");

const AttendanceSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    checkInTime: { type: Date, default: null },
    checkOutTime: { type: Date, default: null },
    checkInLocation: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null }
    },
    checkOutLocation: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null }
    },
    status: { type: String, enum: ["present", "absent", "leave"], default: "present" },
    isLate: { type: Boolean, default: false },
    halfDay: { type: Boolean, default: false },
    workDurationHours: { type: Number, default: 0 } // calculated at checkout
}, { timestamps: true });

AttendanceSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", AttendanceSchema);
