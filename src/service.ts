import { type IKiller, type ISurvivor, Killer, Survivor } from "./model";
import { ScraperOutput } from "./scraper";

function seedDatabase(scraped: ScraperOutput): void {
  Killer.create(scraped.killers);
  Survivor.create(scraped.survivors);
}

async function clearDatabase(): Promise<void> {
  await Killer.deleteMany({});
  await Survivor.deleteMany({});
}

function getAllKillers(): Promise<IKiller[]> {
  return Killer.find({}).exec();
}

function getKillerByName(name: string): Promise<IKiller | null> {
  return Killer.findOne({ name }).exec();
}

function getAllSurvivors(): Promise<ISurvivor[]> {
  return Survivor.find({}).exec();
}

function getSurvivorByName(name: string): Promise<ISurvivor | null> {
  return Survivor.findOne({ name }).exec();
}

export default {
  seedDatabase,
  clearDatabase,
  getAllKillers,
  getKillerByName,
  getAllSurvivors,
  getSurvivorByName,
};
