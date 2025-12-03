const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const role = require("../middlewares/roleMiddleware");

const {
    applyLeave,
    getMyLeaves,
    getPendingLeaves,
    approveLeave,
    rejectLeave
} = require("../controllers/leaveController");

// User Apply
router.post("/apply", auth, applyLeave);

// User My Leaves
router.get("/my", auth, getMyLeaves);

// Admin Get Pending
router.get("/pending", auth, role("admin"), getPendingLeaves);

// Admin Approve/Reject
router.patch("/approve/:id", auth, role("admin"), approveLeave);
router.patch("/reject/:id", auth, role("admin"), rejectLeave);

module.exports = router;
