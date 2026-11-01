import { connectDB, seedDatabase, startServer } from "./server";
import { scrapeWiki, type ScraperOutput } from "./scraper";

async function main() {
  await connectDB();

  try {
    console.log("Running initial data scrape...");
    const out: ScraperOutput = await scrapeWiki();
    console.log("Initial data scraping finished. Seeding DB...");
    await seedDatabase(out);
    console.log("Database seeded successfully.");
  } catch (e) {
    console.error("FATAL: Failed to run initial scraping process.", e);
    process.exit(1);
  }

  startServer();
}

main();
