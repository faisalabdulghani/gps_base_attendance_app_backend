const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");
const allowRoles = require("../middlewares/roleMiddleware");
const {
  getMyProfile,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  changePassword
} = require("../controllers/userController");

// public: none (use /api/auth for register/login)
router.get("/me", auth, getMyProfile);

// admin
router.get("/", auth, allowRoles("admin"), getAllUsers);
router.get("/:id", auth, allowRoles("admin"), getUserById);
router.put("/:id", auth, allowRoles("admin"), updateUser);
router.delete("/:id", auth, allowRoles("admin"), deleteUser);

// change password (self or admin)
router.put("/:id/change-password", auth, changePassword);

module.exports = router;
