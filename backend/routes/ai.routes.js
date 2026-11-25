const express = require("express");
const router = express.Router();
const aiController = require("../controllers/ai.controller");
const { protect } = require("../controllers/authController");
const { authorizeRoles } = require("../middlewares/authorizeRoles");

router.get("/test", (req, res) => {
  res.send("AI route working");
});

// These call a paid LLM API and write to the database, so they are admin-only.
// GENERATE ONLY
router.post(
  "/generate-food-ai",
  protect,
  authorizeRoles("admin"),
  aiController.generateFoodAI
);

// GENERATE + SAVE
router.post(
  "/generate-food-ai/:foodId",
  protect,
  authorizeRoles("admin"),
  aiController.generateAndSaveFoodAI
);

// analyzer
router.put(
  "/admin/restaurants/:id/analyze",
  protect,
  authorizeRoles("admin"),
  aiController.analyzeRestaurantReviews
);

// any logged-in user can review (name comes from their account)
router.put("/stores/:id/review", protect, aiController.addReview);

module.exports = router;
