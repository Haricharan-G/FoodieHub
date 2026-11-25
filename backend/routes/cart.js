const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const cartController = require("../controllers/cartController");

// every cart route requires a logged-in user
router.use(authController.protect);

router.post("/add-to-cart", cartController.addItemToCart);
router.post("/update-cart-item", cartController.updateCartItemQuantity);
router.delete("/delete-cart-item", cartController.deleteCartItem);
router.get("/get-cart", cartController.getCartItem);

module.exports = router;
