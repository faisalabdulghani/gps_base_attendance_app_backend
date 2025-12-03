const User = require("../models/User");
const bcrypt = require("bcryptjs");

// GET /api/users/me
exports.getMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json({ user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/users/   (admin)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.json({ count: users.length, users });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/users/:id  (admin)
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json({ user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/users/:id  (admin)
exports.updateUser = async (req, res) => {
    try {
        const { name, email, role, profileImage } = req.body;
        const updated = await User.findByIdAndUpdate(req.params.id, { name, email, role, profileImage }, { new: true }).select("-password");
        if (!updated) return res.status(404).json({ message: "User not found" });
        res.json({ message: "User updated", user: updated });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE /api/users/:id  (admin)
exports.deleteUser = async (req, res) => {
    try {
        const removed = await User.findByIdAndDelete(req.params.id);
        if (!removed) return res.status(404).json({ message: "User not found" });
        res.json({ message: "User deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/users/:id/change-password  (admin or self)
exports.changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const targetId = req.params.id || req.user.id;

        const user = await User.findById(targetId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // If caller is not admin and changing someone else, deny
        if (req.user.id !== targetId.toString() && req.user.role !== "admin") {
            return res.status(403).json({ message: "Forbidden" });
        }

        if (req.user.role !== "admin") {
            // verify old password
            const match = await bcrypt.compare(oldPassword || "", user.password);
            if (!match) return res.status(400).json({ message: "Old password incorrect" });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        user.password = hashed;
        await user.save();
        res.json({ message: "Password changed" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
