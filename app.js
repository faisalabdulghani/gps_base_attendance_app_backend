const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");
const dotenv = require("dotenv")

dotenv.config()


const app = express();

// Connect Database
connectDB();

app.use(express.json());
app.use(cors());

// Routes
app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/users", require("./src/routes/userRoutes"));
app.use("/api/attendance", require("./src/routes/attendanceRoutes"));
app.use("/api/leave", require("./src/routes/leaveRoutes"));


app.listen(process.env.PORT, () => {
    console.log("server done", process.env.PORT)
})

module.exports = app;
