const express = require("express");
const router = express.Router({ mergeParams: true });

const {
  getAllRestaurants,
  getNearbyRestaurants,
  createRestaurant,
  getRestaurant,
  deleteRestaurant,
} = require("../controllers/restaurantController");

const { protect } = require("../controllers/authController");
const { authorizeRoles } = require("../middlewares/authorizeRoles");

const menuRoutes = require("./menu");

// must be declared BEFORE "/:storeId", otherwise "nearby" is read as an id
router.route("/nearby").get(getNearbyRestaurants);

router
  .route("/")
  .get(getAllRestaurants)
  .post(protect, authorizeRoles("admin"), createRestaurant);

router
  .route("/:storeId")
  .get(getRestaurant)
  .delete(protect, authorizeRoles("admin"), deleteRestaurant);

router.use("/:storeId/menus", menuRoutes);

module.exports = router;
