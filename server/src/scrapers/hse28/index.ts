import { db } from "../../db/index";
import { HSE28_DISTRICTS } from "./districts";
import { parseListingsHtml, type RawProperty } from "./parser";
import { createRateLimiter } from "../../lib/rate-limiter";

const DELAY_MS = parseInt(process.env.SCRAPE_DELAY_MS || "3000");
const MAX_PAGES_PER_DISTRICT = 5;
const rateLimiter = createRateLimiter(DELAY_MS);

async function fetchListingPage(
  listingType: "buy" | "rent",
  areaCode: string,
  dgCode: string,
  page: number
): Promise<string> {
  const url = `https://www.28hse.com/en/${listingType}/residential/${areaCode}/${dgCode}`;
  const fullUrl = page > 1 ? `${url}/p${page}` : url;

  const res = await fetch(fullUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${fullUrl}`);
  }

  return res.text();
}

function upsertProperty(
  sqlite: any,
  listing: RawProperty,
  listingType: "buy" | "rent",
  districtId: string
) {
  const stmt = sqlite.prepare(`
    INSERT INTO properties (external_id, listing_type, district_id, estate_name, address, price, price_per_sqft, area_usable, area_build, bedrooms, property_type, source_url, image_url, scraped_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(external_id) DO UPDATE SET
      price = excluded.price,
      price_per_sqft = excluded.price_per_sqft,
      area_usable = excluded.area_usable,
      scraped_at = excluded.scraped_at
  `);

  const now = Date.now();
  stmt.run(
    listing.externalId,
    listingType,
    districtId,
    listing.estateName,
    listing.address,
    listing.price,
    listing.pricePerSqft,
    listing.areaUsable,
    listing.areaBuild,
    listing.bedrooms,
    listing.propertyType,
    listing.sourceUrl,
    listing.imageUrl,
    now,
    now
  );
}

export async function scrape28hse(
  listingType: "buy" | "rent" = "buy",
  districtFilter?: string[]
) {
  console.log(`=== Scraping 28hse (${listingType}) ===\n`);
  const sqlite = (db as any).$client;
  const start = Date.now();

  let totalInserted = 0;
  const districts = districtFilter
    ? HSE28_DISTRICTS.filter((d) => districtFilter.includes(d.districtId))
    : HSE28_DISTRICTS;

  for (const district of districts) {
    console.log(`  Scraping ${district.name} (${district.areaCode}/${district.dgCode})...`);
    let pageInserted = 0;

    for (let page = 1; page <= MAX_PAGES_PER_DISTRICT; page++) {
      try {
        await rateLimiter();
        const html = await fetchListingPage(listingType, district.areaCode, district.dgCode, page);
        const listings = parseListingsHtml(html);

        if (listings.length === 0) {
          break; // no more results
        }

        for (const listing of listings) {
          try {
            upsertProperty(sqlite, listing, listingType, district.districtId);
            pageInserted++;
          } catch {
            // skip duplicate or malformed
          }
        }

        console.log(`    Page ${page}: ${listings.length} listings`);
      } catch (err: any) {
        console.error(`    Page ${page} error: ${err.message}`);
        break;
      }
    }

    totalInserted += pageInserted;
    console.log(`    Subtotal: ${pageInserted} properties\n`);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`=== Scrape complete: ${totalInserted} properties in ${elapsed}s ===`);
  return totalInserted;
}

// CLI runner
if (import.meta.main) {
  const type = (process.argv[2] as "buy" | "rent") || "buy";
  scrape28hse(type);
}
