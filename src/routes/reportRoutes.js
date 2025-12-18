const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");

const {
    getTodayReport,
    getSummaryReport
} = require("../controllers/reportController");

router.get("/today", auth, getTodayReport);
router.get("/summary", auth, getSummaryReport);

module.exports = router;
