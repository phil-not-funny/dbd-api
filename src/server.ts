import express, { Application } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Service from "./service";
import { ScraperOutput } from "./scraper";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URL = process.env.MONGODB_URL;
const MONGODB_USERNAME = process.env.MONGODB_USERNAME;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE;

export function startServer() {
  app.use(express.json());

  // Simple Root Route
  app.get("/api", (req, res) => {
    res
      .status(200)
      .send(
        "Welcome to the DBD API Backend. Use /killers and /survivors endpoints to access data.",
      );
  });

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  app.get("/api/killers", async (req, res) => {
    const killers = await Service.getAllKillers();
    res.status(200).json(killers);
  });

  app.get("/api/killers/:name", async (req, res) => {
    const name = req.params.name;
    const killer = await Service.getKillerByName(name);
    if (killer) {
      res.status(200).json(killer);
    } else {
      res.status(404).send(`Killer with name "${name}" not found.`);
    }
  });

  app.get("/api/survivors", async (req, res) => {
    const survivors = await Service.getAllSurvivors();
    res.status(200).json(survivors);
  });

  app.get("/api/survivors/:name", async (req, res) => {
    const name = req.params.name;
    const survivor = await Service.getSurvivorByName(name);
    if (survivor) {
      res.status(200).json(survivor);
    } else {
      res.status(404).send(`Survivor with name "${name}" not found.`);
    }
  });
}

export async function connectDB() {
  if (
    !MONGODB_URL ||
    !MONGODB_USERNAME ||
    !MONGODB_PASSWORD ||
    !MONGODB_DATABASE
  ) {
    console.error(
      "Fatal: One or more MongoDB environment variables are not set! Check .env.example",
    );
    process.exit(1);
  }

  const uri =
    (MONGODB_URL.startsWith("localhost") || MONGODB_URL.startsWith("127.0.0.1")
      ? "mongodb://"
      : "mongodb+srv://") +
    `${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_URL}/${MONGODB_DATABASE}`;
  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected successfully.");
  } catch (e) {
    console.error("MongoDB connection error:", (e as Error).message);
    process.exit(1);
  }
}

export async function seedDatabase(scraped: ScraperOutput): Promise<void> {
  await Service.clearDatabase();
  Service.seedDatabase(scraped);
}
