const Cart = require("../models/cartModel");
const FoodItem = require("../models/foodItem");
const Restaurant = require("../models/restaurant");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

// "stock" is selected so the cart page can enforce the stock limit
const populatedCart = (userId) =>
  Cart.findOne({ user: userId })
    .populate({ path: "items.foodItem", select: "name price images stock" })
    .populate({ path: "restaurant", select: "name" });

const parseQuantity = (value) => {
  const q = Number(value);
  return Number.isInteger(q) && q >= 1 ? q : null;
};

// The logged-in user always comes from the JWT (req.user), NEVER from the body,
// so nobody can read or edit another user's cart.

exports.addItemToCart = catchAsyncErrors(async (req, res, next) => {
  const { foodItemId, restaurantId } = req.body;
  const quantity = parseQuantity(req.body.quantity);
  const userId = req.user._id;

  if (!quantity) {
    return next(new ErrorHandler("Quantity must be a whole number of at least 1", 400));
  }

  const foodItem = await FoodItem.findById(foodItemId);
  if (!foodItem) {
    return next(new ErrorHandler("Food item not found", 404));
  }

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    return next(new ErrorHandler("Restaurant not found", 404));
  }

  if (foodItem.restaurant && foodItem.restaurant.toString() !== String(restaurantId)) {
    return next(new ErrorHandler("This item does not belong to that restaurant", 400));
  }

  let cart = await Cart.findOne({ user: userId });

  // a cart can only hold items from one restaurant; switching restaurants starts a new cart
  if (cart && cart.restaurant.toString() !== String(restaurantId)) {
    await Cart.deleteOne({ _id: cart._id });
    cart = null;
  }

  if (!cart) {
    if (quantity > foodItem.stock) {
      return next(new ErrorHandler(`Only ${foodItem.stock} of '${foodItem.name}' available`, 400));
    }
    cart = new Cart({
      user: userId,
      restaurant: restaurantId,
      items: [{ foodItem: foodItemId, quantity }],
    });
  } else {
    const itemIndex = cart.items.findIndex(
      (item) => item.foodItem.toString() === String(foodItemId)
    );
    const newQuantity =
      (itemIndex > -1 ? cart.items[itemIndex].quantity : 0) + quantity;

    if (newQuantity > foodItem.stock) {
      return next(new ErrorHandler(`Only ${foodItem.stock} of '${foodItem.name}' available`, 400));
    }

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity = newQuantity;
    } else {
      cart.items.push({ foodItem: foodItemId, quantity });
    }
  }

  await cart.save();

  res.status(200).json({ message: "Cart updated", cart: await populatedCart(userId) });
});

exports.updateCartItemQuantity = catchAsyncErrors(async (req, res, next) => {
  const { foodItemId } = req.body;
  const quantity = parseQuantity(req.body.quantity);
  const userId = req.user._id;

  if (!quantity) {
    return next(new ErrorHandler("Quantity must be a whole number of at least 1", 400));
  }

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    return next(new ErrorHandler("Cart not found", 404));
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.foodItem.toString() === String(foodItemId)
  );
  if (itemIndex === -1) {
    return next(new ErrorHandler("Food item not found in cart", 404));
  }

  const foodItem = await FoodItem.findById(foodItemId);
  if (!foodItem) {
    return next(new ErrorHandler("Food item not found", 404));
  }
  if (quantity > foodItem.stock) {
    return next(new ErrorHandler(`Only ${foodItem.stock} of '${foodItem.name}' available`, 400));
  }

  cart.items[itemIndex].quantity = quantity;
  await cart.save();

  res.status(200).json({
    message: "Cart item quantity updated",
    cart: await populatedCart(userId),
  });
});

exports.deleteCartItem = catchAsyncErrors(async (req, res, next) => {
  const { foodItemId } = req.body;
  const userId = req.user._id;

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    return next(new ErrorHandler("Cart not found", 404));
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.foodItem.toString() === String(foodItemId)
  );
  if (itemIndex === -1) {
    return next(new ErrorHandler("Food item not found in cart", 404));
  }

  cart.items.splice(itemIndex, 1);

  if (cart.items.length === 0) {
    await Cart.deleteOne({ _id: cart._id });
    return res.status(200).json({ message: "Cart deleted" });
  }

  await cart.save();

  res.status(200).json({
    message: "Cart item deleted",
    cart: await populatedCart(userId),
  });
});

exports.getCartItem = catchAsyncErrors(async (req, res, next) => {
  const cart = await populatedCart(req.user._id);

  // An empty cart is not an error. Returning an empty cart (instead of a 404)
  // also makes the frontend clear stale items after the cart was deleted.
  res.status(200).json({
    status: "success",
    data: cart || { items: [], restaurant: {} },
  });
});
