const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

// Connect Database
connectDB();

app.use(express.json());
app.use(cors());

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/leave", require("./routes/leaveRoutes"));

module.exports = app;
