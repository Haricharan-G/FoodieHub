const ErrorHandler = require("../utils/errorHandler");

module.exports = (err, req, res, next) => {
  let error = err;
  error.statusCode = err.statusCode || 500;

  // Normalise well-known errors (in every environment, not only production)
  if (err.name === "CastError") {
    error = new ErrorHandler(`Resource not found. Invalid: ${err.path}`, 400);
  } else if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((value) => value.message)
      .join(", ");
    error = new ErrorHandler(message, 400);
  } else if (err.code === 11000) {
    error = new ErrorHandler(
      `Duplicate ${Object.keys(err.keyValue || {}).join(", ")} entered`,
      400
    );
  } else if (err.name === "JsonWebTokenError") {
    error = new ErrorHandler("Invalid token. Please log in again.", 401);
  } else if (err.name === "TokenExpiredError") {
    error = new ErrorHandler("Your session has expired. Please log in again.", 401);
  }

  // Only expose stack traces when explicitly running in DEVELOPMENT.
  // Any other value (or none) behaves like production, so nothing hangs
  // and nothing leaks.
  if (process.env.NODE_ENV === "DEVELOPMENT") {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errMessage: error.message,
      stack: err.stack,
    });
  }

  res.status(error.statusCode).json({
    success: false,
    // don't leak internals of unexpected (500) errors
    message:
      error.statusCode === 500 ? "Internal Server Error" : error.message,
  });
};
