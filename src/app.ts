import express, { Application } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URL = process.env.MONGODB_URL;
const MONGODB_USERNAME = process.env.MONGODB_USERNAME;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE;

// Middleware
app.use(express.json());

// MongoDB Connection
if (
  !MONGODB_URL ||
  !MONGODB_USERNAME ||
  !MONGODB_PASSWORD ||
  !MONGODB_DATABASE
) {
  console.error(
    "FATAL ERROR: One or more MongoDB environment variables are not set.",
  );
  process.exit(1);
}

const uri = `${MONGODB_URL.startsWith("localhost") || MONGODB_URL.startsWith("127.0.0.1") ? "mongodb://" : "mongodb+srv://"}${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_URL}/${MONGODB_DATABASE}`;

mongoose
  .connect(uri)
  .then(() => {
    console.log("Successfully connected to MongoDB.");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });

// --- MVC Structure Layout ---
// Controllers will be imported here later
// const userController = require('./controllers/userController');

// Simple Root Route
app.get("/", (req, res) => {
  res.status(200).send("Welcome to the DBD API Backend.");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
