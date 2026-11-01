/**
 * Dead by Daylight wiki scraper
 * Lists every Killer (with Power and unique Perks) and every Survivor (with unique Perks).
 *
 * The main page provides the roster; each character's detail page provides
 * the unique Perks (and, for Killers, the Power).
 *
 * Usage:
 *   npm install
 *   npm start                          # writes dbd-data.json and prints a summary
 *   npm start -- --out data.json       # custom output path
 *   npm start -- --only "Clown"        # only characters whose name contains the text (testing)
 *   npm run typecheck                  # type-check without running
 *
 * Requires Node 18+ (built-in fetch).
 */
import { writeFile } from "node:fs/promises";
import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import dotenv from "dotenv";
import { sleep, clean, errMessage, runConcurrently } from "./helpers";
import type {
  IKiller as Killer,
  ISurvivor as Survivor,
  IPerk as Perk,
} from "./model";

dotenv.config();

/*
 * TYPES
 */

type $ = cheerio.CheerioAPI;
type Selection = cheerio.Cheerio<AnyNode>;

interface RosterEntry {
  type: "killer" | "survivor";
  name: string;
  url: string;
  icon: string | null;
}

interface PowerInfo {
  power: string | null;
  powerIcon: string | null;
}

export interface ScraperOutput {
  source: string;
  generatedAt: string;
  killers: Killer[];
  survivors: Survivor[];
}

/*
 * CONFIG
 */

const BASE = "https://deadbydaylight.wiki.gg";
const MAIN_PAGE = `${BASE}/wiki/Dead_by_Daylight_Wiki`;
const USER_AGENT = "dbd-wiki-scraper/1.0 (personal, non-commercial use)";
const CONCURRENCY = process.env.CONCURRENCY
  ? parseInt(process.env.CONCURRENCY)
  : 4;
const REQUEST_DELAY_MS = 250;

const args = process.argv.slice(2);
const argValue = (flag: string): string | null => {
  const i = args.indexOf(flag);
  return i >= 0 ? (args[i + 1] ?? null) : null;
};
const outPath = argValue("--out") ?? "dbd-data.json";
const onlyFilter = argValue("--only")?.toLowerCase() ?? null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const absolute = (href: string | undefined | null): string | null =>
  href ? new URL(href, BASE).href : null;

/** Image URL of an <img>; thumbnails are converted to the full-size file, cache query dropped. */
function imageUrl(img: Selection | undefined): string | null {
  if (!img || !img.length) return null;
  const src = img.attr("data-src") || img.attr("src") || "";
  if (!src || src.startsWith("data:")) return null;
  const url = new URL(src, BASE);
  // /images/thumb/a/ab/File.png/120px-File.png -> /images/a/ab/File.png
  url.pathname = url.pathname.replace(
    /\/images\/thumb\/(.+?)\/[^/]+$/,
    "/images/$1",
  );
  url.search = "";
  return url.href;
}

/**
 * Fetches the Wiki's DOM with the given url, retrying on failure.
 */
async function getHtml(url: string, retries = 3): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt >= retries)
        throw new Error(`Failed to fetch ${url}: ${errMessage(err)}`);
      await sleep(500 * attempt);
      console.warn(`Retrying ${url} (attempt ${attempt + 1}/${retries})...`);
    }
  }
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

/**
 * Searches the main page for character links and returns a roster of all characters.
 *
 * The same character can be linked several times (Recent Releases, All Killers, Featured Article),
 * and the Featured Article may use an alias page ("Art_The_Clown" instead of "The_Terrifier").
 * Characters are therefore identified by the ID in the portrait file name (e.g. K45), not by link URL. (Sloppy, ik but throw your complaints at the wiki.)
 * If an ID has several links, the one whose page name matches the portrait file name is preferred
 * ("The_Terrifier" for K45_TheTerrifier_Portrait.png); otherwise the first link wins.
 * @param html The HTML of the main page.
 * @returns The array of characters found (RosterEntry), one per character, sorted by ID.
 */
function parseRoster(html: string): RosterEntry[] {
  const $ = cheerio.load(html);
  // Lower-case, accent-free, letters and digits only: "The_Onry%C5%8D" and "TheOnryo" -> "theonryo"
  const slugify = (s: string): string =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase();

  // = candidate links per character ID (K01, S24, ...)
  const candidates = new Map<
    string,
    { entry: RosterEntry; matchesFile: boolean }[]
  >();

  $("a").each((_, el) => {
    const $a = $(el);
    const img = $a.find("img");
    const src = img.attr("src") || img.attr("data-src") || "";
    const m = src.match(/\/([KS]\d+)_([^/]*?)_Portrait\./);
    if (!m) return;
    const id = m[1] as string;
    const url = absolute($a.attr("href"));
    if (!url) return;

    const pageSlug = slugify(
      decodeURIComponent(new URL(url).pathname.split("/").pop() ?? ""),
    );
    const list = candidates.get(id) ?? [];
    list.push({
      matchesFile: pageSlug === slugify(m[2] as string),
      entry: {
        type: id.startsWith("K") ? "killer" : "survivor",
        name: clean($a.attr("title")),
        url,
        icon: imageUrl(img.first()),
      },
    });
    candidates.set(id, list);
  });

  // One entry per ID, in numeric order (K01, K02, ...) instead of page order.
  return [...candidates.entries()]
    .sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)))
    .map(
      ([, list]) =>
        (list.find((c) => c.matchesFile) ?? (list[0] as (typeof list)[number]))
          .entry,
    );
}

/**
 * Turns a table cell into plain text.
 * Icons are dropped, \<br> and block elements become line breaks, list items get a "- " prefix, and spacing is normalised.
 */
function cellToText($: $, cell: Selection): string {
  const c = cell.clone();
  c.find("img, .iconLink, sup, style, script").remove();
  c.find("br").replaceWith("\n");
  c.find("li").each((_, li) => {
    $(li).prepend("- ");
    $(li).before("\n").after("\n");
  });
  c.find("p, div, ul, ol, dl, dd, dt").each((_, el) => {
    $(el).before("\n").after("\n");
  });
  return c
    .text()
    .split("\n")
    .map((line) =>
      line
        .replace(/[ \t\u00a0]+/g, " ")
        .replace(/\s+([.,;:!?)])/g, "$1")
        .trim(),
    )
    .filter(Boolean)
    .join("\n");
}

/**
 * Searches the character detail page for a table of perks and returns those found.
 */
function parsePerks(html: string): Perk[] {
  const $ = cheerio.load(html);
  const perks: Perk[] = [];

  const perkFromRow = (tr: AnyNode): void => {
    const cells = $(tr).children("td, th");
    if (cells.length < 3) return;
    const name = clean(cells.eq(1).text());
    const description = cellToText($, cells.eq(2));
    if (!name || !description || perks.some((p) => p.name === name)) return;
    const href = cells.slice(0, 2).find("a[href]").first().attr("href");
    const icon = imageUrl(cells.eq(0).find("img").first());
    perks.push({ name, url: absolute(href), icon, description });
  };

  // Strategy A: the table that follows the "Unique Perks" heading.
  $("h2, h3, h4").each((_, h) => {
    if (!/^unique perks/i.test(clean($(h).text()))) return;
    const start = $(h).parent().is(".mw-heading") ? $(h).parent() : $(h);
    const between = start.nextUntil("h1, h2, h3, h4, .mw-heading");
    const table = between.filter("table").add(between.find("table")).first();
    table.find("tr").each((_, tr) => perkFromRow(tr));
    return false;
  });

  // Strategy B: any table row whose first cell holds a perk icon.
  if (!perks.length) {
    $("table tr").each((_, tr) => {
      const src =
        $(tr).children("td, th").first().find("img").attr("src") || "";
      if (/icons?perks_/i.test(src)) perkFromRow(tr);
    });
  }
  return perks;
}

/**
 * Searches the killer detail page for a power table cell and returns it.
 */
function parsePower(html: string): PowerInfo {
  const $ = cheerio.load(html);
  let power: string | null = null;
  let powerIcon: string | null = null;

  $("table tr").each((_, tr) => {
    const cells = $(tr).children("th, td");
    if (cells.length >= 2 && clean(cells.eq(0).text()) === "Power") {
      const cell = cells.eq(1).clone();
      powerIcon = imageUrl(cell.find("img").first());
      cell.find("img").remove();
      cell.find("br").replaceWith(" / ");
      power = clean(cell.text());
      return false;
    }
  });

  // Fallback: any image on the page whose file name looks like a power icon.
  if (!powerIcon) {
    $("img").each((_, img) => {
      const src = $(img).attr("data-src") || $(img).attr("src") || "";
      if (/icons?_?powers?[_.]/i.test(src)) {
        powerIcon = imageUrl($(img));
        return false;
      }
    });
  }
  return { power, powerIcon };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface Scraped {
  entry: RosterEntry;
  perks: Perk[];
  power: PowerInfo;
}

export async function scrapeWiki(outToFile?: boolean): Promise<ScraperOutput> {
  console.log("Fetching roster...");
  let roster = parseRoster(await getHtml(MAIN_PAGE));
  if (!roster.length)
    throw new Error("No characters found; the wiki markup may have changed.");
  if (onlyFilter)
    roster = roster.filter((re) => re.name.toLowerCase().includes(onlyFilter));

  console.log(`Fetching ${roster.length} character pages...`);
  let done = 0;
  const scraped = await runConcurrently<RosterEntry, Scraped>(
    roster,
    async (entry) => {
      let perks: Perk[] = [];
      let power: PowerInfo = { power: null, powerIcon: null };
      try {
        const html = await getHtml(entry.url);
        perks = parsePerks(html);
        if (entry.type === "killer") power = parsePower(html);
        if (!perks.length)
          console.error(
            `  warning: no perks found for ${entry.name} (${entry.url})`,
          );
      } catch (err) {
        console.error(`  ${entry.name}: ${errMessage(err)}`);
      }
      console.log(`  [${++done}/${roster.length}] ${entry.name}`);
      return { entry, perks, power };
    },
    CONCURRENCY,
    REQUEST_DELAY_MS,
  );

  const killers: Killer[] = scraped
    .filter((s) => s.entry.type === "killer")
    .map(({ entry, perks, power }) => ({
      name: entry.name,
      url: entry.url,
      icon: entry.icon,
      power: power.power,
      powerIcon: power.powerIcon,
      perks,
    }));

  const survivors: Survivor[] = scraped
    .filter((s) => s.entry.type === "survivor")
    .map(({ entry, perks }) => ({
      name: entry.name,
      url: entry.url,
      icon: entry.icon,
      perks,
    }));

  const data: ScraperOutput = {
    source: BASE,
    generatedAt: new Date().toISOString(),
    killers,
    survivors,
  };
  if (outToFile) {
    await writeFile(outPath, JSON.stringify(data, null, 2), "utf8");
  }
  return data;
}
