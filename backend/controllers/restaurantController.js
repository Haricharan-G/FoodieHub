const Restaurant = require("../models/restaurant");
const ErrorHandler = require("../utils/errorHandler");
const catchAsync = require("../middlewares/catchAsyncErrors");
const APIFeatures = require("../utils/apiFeatures");

exports.getAllRestaurants = catchAsync(async (req, res, next) => {
  const apiFeatures = new APIFeatures(Restaurant.find(), req.query)
    .search()
    .sort();
  const restaurants = await apiFeatures.query;
  res.status(200).json({
    status: "success",
    count: restaurants.length,
    restaurants: restaurants,
  });
});

// GET /api/v1/eats/stores/nearby?lat=12.97&lng=77.59&radius=5&veg=true
// Restaurants within `radius` km of the given point, closest first.
exports.getNearbyRestaurants = catchAsync(async (req, res, next) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusKm = req.query.radius === undefined ? 5 : Number(req.query.radius);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return next(
      new ErrorHandler("Valid lat and lng query parameters are required", 400)
    );
  }

  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 100) {
    return next(new ErrorHandler("radius must be between 0 and 100 (km)", 400));
  }

  const geoNear = {
    near: { type: "Point", coordinates: [lng, lat] }, // GeoJSON order: [lng, lat]
    distanceField: "distanceMeters",
    maxDistance: radiusKm * 1000,
    spherical: true,
  };

  if (req.query.veg === "true") {
    geoNear.query = { isVeg: true };
  }

  // $geoNear uses the 2dsphere index on `location` and sorts by distance
  const results = await Restaurant.aggregate([
    { $geoNear: geoNear },
    { $limit: 50 },
  ]);

  const restaurants = results.map(({ distanceMeters, ...restaurant }) => ({
    ...restaurant,
    distanceKm: Math.round(distanceMeters / 100) / 10, // 1 decimal place
  }));

  res.status(200).json({
    status: "success",
    count: restaurants.length,
    restaurants,
  });
});

exports.createRestaurant = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.create(req.body);
  res.status(201).json({
    status: "success",
    data: restaurant,
  });
});

//Get restaurant by id
exports.getRestaurant = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.storeId);

  if (!restaurant)
    return next(new ErrorHandler("No Restaurant found with that ID", 404));

  res.status(200).json({
    status: "success",
    data: restaurant,
  });
});

exports.deleteRestaurant = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findByIdAndDelete(req.params.storeId);

  if (!restaurant)
    return next(new ErrorHandler("No document found with that ID", 404));

  res.status(204).json({
    status: "success",
  });
});
