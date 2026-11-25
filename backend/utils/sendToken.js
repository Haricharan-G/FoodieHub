const sendToken = (user, statusCode, res) => {
  const token = user.getJWTToken();
  const isProd = process.env.NODE_ENV === "PRODUCTION";

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_EXPIRES_TIME * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    // frontend and API are on different domains in production, so the cookie
    // must be SameSite=None; Secure there
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
  };

  res.cookie("jwt", token, cookieOptions);

  user.password = undefined;

  // the token lives in the HttpOnly cookie only; it is not echoed in the body
  res.status(statusCode).json({
    success: true,
    data: { user },
  });
};

module.exports = sendToken;
