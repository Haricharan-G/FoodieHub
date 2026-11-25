const Coupon = require("../models/couponModel");
const ErrorHandler = require("../utils/errorHandler");
const catchAsync = require("../middlewares/catchAsyncErrors");

exports.createCoupon = catchAsync(async (req, res, next) => {
  const coupon = await Coupon.create(req.body);
  res.status(200).json({
    status: "success",
    data: coupon,
  });
});

exports.getCoupon = catchAsync(async (req, res, next) => {
  const coupons = await Coupon.find();
  // if(!coupons) return next(new ErrorHandler(''))
  res.status(200).json({
    status: "success",
    data: coupons,
  });
});

exports.updateCoupon = catchAsync(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.couponId, req.body, {
    new: true,
    runValidators: true,
  });

  if (!coupon)
    return next(new ErrorHandler("No Coupon found with that ID", 404));

  res.status(200).json({
    status: "success",
    data: coupon,
  });
});

exports.deleteCoupon = catchAsync(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.couponId);
  if (!coupon)
    return next(new ErrorHandler("No coupon found with given Id", 404));

  res.status(204).json({
    status: "success",
  });
});

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// POST /api/v1/coupon/validate   { couponCode, cartItemsTotalAmount }
exports.couponValidate = catchAsync(async (req, res, next) => {
  const { couponCode } = req.body;
  const cartTotal = Number(req.body.cartItemsTotalAmount);

  if (!couponCode || !Number.isFinite(cartTotal) || cartTotal <= 0) {
    return next(
      new ErrorHandler("couponCode and a valid cartItemsTotalAmount are required", 400)
    );
  }

  // only the coupon the user typed, and only if it has not expired
  const coupon = await Coupon.findOne({
    couponName: new RegExp(`^${escapeRegex(String(couponCode).trim())}$`, "i"),
    expire: { $gt: new Date() },
  });

  if (!coupon) {
    return next(new ErrorHandler("Invalid or expired coupon code.", 404));
  }

  if (cartTotal < coupon.minAmount) {
    return res.status(200).json({
      status: "success",
      data: {
        applicable: false,
        couponName: coupon.couponName,
        discountAmount: 0,
        finalTotal: cartTotal,
        message: `Add ₹${(coupon.minAmount - cartTotal).toFixed(2)} more to avail this offer`,
      },
    });
  }

  const percentOff = (cartTotal * coupon.discount) / 100;
  const cap = Number.isFinite(coupon.maxDiscount) ? coupon.maxDiscount : Infinity;
  const discountAmount = Math.round(Math.min(percentOff, cap) * 100) / 100;

  res.status(200).json({
    status: "success",
    data: {
      applicable: true,
      couponName: coupon.couponName,
      subTitle: coupon.subTitle,
      details: coupon.details,
      discountAmount,
      finalTotal: Math.round((cartTotal - discountAmount) * 100) / 100,
      message: "",
    },
  });
});
