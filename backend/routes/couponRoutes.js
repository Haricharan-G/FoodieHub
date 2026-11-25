const express = require("express");

const {
  createCoupon,
  getCoupon,
  updateCoupon,
  deleteCoupon,
  couponValidate,
} = require("../controllers/couponController");
const { protect } = require("../controllers/authController");
const { authorizeRoles } = require("../middlewares/authorizeRoles");

const router = express.Router();

router.route("/validate").post(protect, couponValidate);

router
  .route("/")
  .get(protect, getCoupon)
  .post(protect, authorizeRoles("admin"), createCoupon);

router
  .route("/:couponId")
  .patch(protect, authorizeRoles("admin"), updateCoupon)
  .delete(protect, authorizeRoles("admin"), deleteCoupon);

module.exports = router;
