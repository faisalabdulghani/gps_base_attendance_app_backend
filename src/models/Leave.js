const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    leaveType: {
        type: String,
        enum: ["Sick", "Casual", "Annual", "Half-day", "Unpaid"],
        required: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    totalDays: { type: Number, required: true },

    reason: { type: String, required: true },

    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Leave", leaveSchema);
