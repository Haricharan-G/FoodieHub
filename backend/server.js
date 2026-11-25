require("dns").setServers(["8.8.8.8", "1.1.1.1"]);
const app = require("./app");
const connectDatabase = require("./config/database");

// const dotenv = require("dotenv");
const dotenv = require("dotenv");
const cloudinary = require("cloudinary");
const { setDriver } = require("mongoose");

//Handle Uncaught exceptions
process.on("uncaughtException", (err) => {
  console.log(`ERROR: ${err.stack}`);
  console.log("Shutting down server due to uncaught exception");
  process.exit(1);
});

//setting up config file
dotenv.config({ path: "./config/config.env" });

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from config/config.env");
}

// Setting up cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

let server;

connectDatabase()
  .then(() => {
    server = app.listen(process.env.PORT, () => {
      console.log(
        `Server started on PORT: ${process.env.PORT} in ${process.env.NODE_ENV} mode.`,
      );
    });
  })
  .catch(() => process.exit(1));

//Handle Unhandled Promise rejections
process.on("unhandledRejection", (err) => {
  console.log(`ERROR: ${err.message}`);
  console.log("Shutting down the server due to Unhandled Promise rejection");
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});
