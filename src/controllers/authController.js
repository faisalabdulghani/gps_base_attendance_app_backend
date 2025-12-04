const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
    try {
        const { name, email, password, confirmPassword, role } = req.body;

        // 1. Validate fields
        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({ message: "Missing fields" });
        }

        // 2. Check password and confirmPassword match
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        // 3. Check password length
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        // 4. Check if email already exists
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: "Email already exists" });
        }

        // 5. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 6. Create user (❗ DO NOT STORE confirmPassword)
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role || "employee",
        });

        // 7. Send clean response
        return res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            }
        });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};


exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Missing credentials" });

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid Email" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid Password" });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "secret", { expiresIn: process.env.JWT_EXPIRE || "7d" });

        return res.status(200).json({
            message: "Login successful",
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};
