import * as cheerio from "cheerio";

export interface RawProperty {
  externalId: string;
  estateName: string | null;
  address: string | null;
  price: number | null;
  pricePerSqft: number | null;
  areaUsable: number | null;
  areaBuild: number | null;
  bedrooms: number | null;
  propertyType: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
}

export function parsePrice(text: string): number | null {
  if (!text) return null;
  // Handle "售 $2,280 萬元" or "$12,800" (rent) or "2,280萬"
  const cleaned = text.replace(/[,\s]/g, "");
  const wanMatch = cleaned.match(/\$?([\d.]+)萬/);
  if (wanMatch) return Math.round(parseFloat(wanMatch[1]) * 10000);
  const dollarMatch = cleaned.match(/\$?([\d.]+)/);
  if (dollarMatch) return Math.round(parseFloat(dollarMatch[1]));
  return null;
}

export function parseArea(text: string): number | null {
  if (!text) return null;
  const match = text.replace(/[,\s]/g, "").match(/([\d.]+)/);
  return match ? Math.round(parseFloat(match[1])) : null;
}

export function parseBedrooms(text: string): number | null {
  if (!text) return null;
  const match = text.match(/(\d+)\s*(?:房|room|br|bed)/i);
  if (match) return parseInt(match[1]);
  // Try "開放式" = studio = 0
  if (text.includes("開放式") || text.toLowerCase().includes("studio")) return 0;
  return null;
}

export function parseListingsHtml(html: string): RawProperty[] {
  const $ = cheerio.load(html);
  const listings: RawProperty[] = [];

  // 28hse listing cards - try multiple selectors for resilience
  const selectors = [
    ".property_item",
    ".search_result_item",
    "[class*='property']",
    ".item_info",
  ];

  let $items = $([]);
  for (const sel of selectors) {
    $items = $(sel);
    if ($items.length > 0) break;
  }

  // If no structured items found, try parsing links with property IDs
  if ($items.length === 0) {
    $("a[href*='property-']").each((_, el) => {
      const href = $(el).attr("href") || "";
      const idMatch = href.match(/property-(\d+)/);
      if (!idMatch) return;

      const externalId = idMatch[1];
      // Avoid duplicates
      if (listings.some((l) => l.externalId === externalId)) return;

      const $parent = $(el).closest("div").parent();
      const text = $parent.text();

      listings.push({
        externalId,
        estateName: $(el).text().trim() || null,
        address: null,
        price: parsePrice(text),
        pricePerSqft: null,
        areaUsable: parseArea(text),
        areaBuild: null,
        bedrooms: parseBedrooms(text),
        propertyType: "residential",
        sourceUrl: href.startsWith("http") ? href : `https://www.28hse.com${href}`,
        imageUrl: $parent.find("img").attr("src") || null,
      });
    });
    return listings;
  }

  $items.each((_, el) => {
    const $el = $(el);
    const link = $el.find("a[href*='property-']").first();
    const href = link.attr("href") || "";
    const idMatch = href.match(/property-(\d+)/);
    if (!idMatch) return;

    const externalId = idMatch[1];
    const text = $el.text();

    const price = parsePrice(text);
    const area = parseArea(text);
    const pricePerSqft = price && area && area > 0 ? Math.round(price / area) : null;

    listings.push({
      externalId,
      estateName: link.text().trim() || $el.find("[class*='name'], [class*='title']").first().text().trim() || null,
      address: $el.find("[class*='addr'], [class*='location']").first().text().trim() || null,
      price,
      pricePerSqft,
      areaUsable: area,
      areaBuild: null,
      bedrooms: parseBedrooms(text),
      propertyType: "residential",
      sourceUrl: href.startsWith("http") ? href : `https://www.28hse.com${href}`,
      imageUrl: $el.find("img").attr("src") || $el.find("img").attr("data-src") || null,
    });
  });

  return listings;
}
