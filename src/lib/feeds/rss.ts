import { XMLParser } from "fast-xml-parser";
import type { FeedItem, FeedSource } from "./types";

interface RssConfig {
  id: string;
  label: string;
  url: string;
  agency: string;
  jurisdiction: string;
  docType: string;
}

// Public RSS feeds from regulators. Add more here; anything RSS 2.0 or Atom works.
export const RSS_FEEDS: RssConfig[] = [
  { id: "sec-press", label: "SEC press releases", url: "https://www.sec.gov/news/pressreleases.rss", agency: "Securities and Exchange Commission", jurisdiction: "US", docType: "Press release" },
  { id: "sec-litigation", label: "SEC litigation releases", url: "https://www.sec.gov/enforcement-litigation/litigation-releases/rss", agency: "Securities and Exchange Commission", jurisdiction: "US", docType: "Enforcement" },
  { id: "fca-news", label: "UK FCA news", url: "https://www.fca.org.uk/news/rss.xml", agency: "Financial Conduct Authority", jurisdiction: "UK", docType: "Guidance" },
];

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@" });
const text = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && "#text" in (v as Record<string, unknown>)) return String((v as Record<string, unknown>)["#text"]);
  return String(v);
};
const stripHtml = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

export function parseFeed(xml: string, cfg: RssConfig): FeedItem[] {
  const doc = parser.parse(xml);
  const rssItems = doc?.rss?.channel?.item;
  const atomEntries = doc?.feed?.entry;
  const items: Record<string, unknown>[] = [rssItems ?? atomEntries ?? []].flat();
  return items
    .map((it) => {
      const link = typeof it.link === "object" && it.link && "@href" in it.link ? String((it.link as Record<string, unknown>)["@href"]) : text(it.link);
      const published = new Date(text(it.pubDate ?? it.published ?? it.updated ?? it["dc:date"]));
      const id = text(it.guid ?? it.id) || link;
      return {
        source: cfg.id,
        externalId: id.slice(0, 300),
        title: stripHtml(text(it.title)),
        agency: cfg.agency,
        jurisdiction: cfg.jurisdiction,
        docType: cfg.docType,
        abstract: stripHtml(text(it.description ?? it.summary ?? it.content)).slice(0, 4000),
        url: link,
        publishedAt: Number.isNaN(published.getTime()) ? new Date() : published,
        effectiveAt: null,
        commentDeadline: null,
      } satisfies FeedItem;
    })
    .filter((i) => i.title && i.url);
}

export const rssSources: FeedSource[] = RSS_FEEDS.map((cfg) => ({
  id: cfg.id,
  label: cfg.label,
  async fetch({ since, fetchImpl = fetch }) {
    const res = await fetchImpl(cfg.url, {
      // SEC asks automated clients to identify themselves.
      headers: { "user-agent": process.env.FEED_USER_AGENT ?? "AI Auditor compliance monitor (contact: admin@example.com)" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`${cfg.label} returned ${res.status}`);
    return parseFeed(await res.text(), cfg).filter((i) => i.publishedAt >= since);
  },
}));
