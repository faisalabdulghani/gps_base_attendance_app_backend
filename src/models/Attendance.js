// src/models/Attendance.js
const mongoose = require("mongoose");

const AttendanceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    date: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^\d{4}-\d{2}-\d{2}$/.test(v);
            },
            message: 'Date must be in YYYY-MM-DD format'
        }
    },
    checkInTime: {
        type: Date,
        default: null
    },
    checkOutTime: {
        type: Date,
        default: null
    },
    checkInLocation: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null }
    },
    checkOutLocation: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null }
    },
    status: {
        type: String,
        enum: ["present", "absent", "leave", "late"],
        default: "present"
    },
    isLate: {
        type: Boolean,
        default: false
    },
    halfDay: {
        type: Boolean,
        default: false
    },
    workDurationHours: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Compound unique index to prevent duplicate attendance per user per day
AttendanceSchema.index({ user: 1, date: 1 }, { unique: true });

// Index for faster queries
AttendanceSchema.index({ date: 1 });
AttendanceSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Attendance", AttendanceSchema);