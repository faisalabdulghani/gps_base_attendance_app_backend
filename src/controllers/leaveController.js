const Leave = require("../models/Leave");

// APPLY FOR LEAVE
exports.applyLeave = async (req, res) => {
    try {
        const { leaveType, startDate, endDate, reason } = req.body;

        if (!leaveType || !startDate || !endDate || !reason) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
            return res.status(400).json({ message: "Start date cannot be greater than end date" });
        }

        // Auto-calc total days
        const totalDays =
            Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

        const leave = await Leave.create({
            user: req.user.id,
            leaveType,
            startDate,
            endDate,
            totalDays,
            reason
        });

        return res.status(201).json({
            message: "Leave request submitted",
            leave
        });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};


// GET LOGGED-IN USER LEAVES
exports.getMyLeaves = async (req, res) => {
    try {
        const leaves = await Leave.find({ user: req.user.id })
            .sort({ createdAt: -1 });

        res.json(leaves);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// GET ALL PENDING LEAVES (ADMIN)
exports.getPendingLeaves = async (req, res) => {
    try {
        const leaves = await Leave.find({ status: "pending" })
            .populate("user", "name email");

        res.json(leaves);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// APPROVE LEAVE
exports.approveLeave = async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id)
            .populate("user", "name email");

        if (!leave) return res.status(404).json({ message: "Leave not found" });

        leave.status = "approved";
        await leave.save();

        res.json({ message: "Leave approved", leave });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// REJECT LEAVE
exports.rejectLeave = async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id)
            .populate("user", "name email");

        if (!leave) return res.status(404).json({ message: "Leave not found" });

        leave.status = "rejected";
        await leave.save();

        res.json({ message: "Leave rejected", leave });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
