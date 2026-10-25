export interface FeedItem {
  source: string;
  externalId: string;
  title: string;
  agency: string;
  jurisdiction: string;
  docType: string;
  abstract: string;
  url: string;
  publishedAt: Date;
  effectiveAt: Date | null;
  commentDeadline: Date | null;
}

export interface FeedSource {
  id: string;
  label: string;
  fetch(opts: { since: Date; fetchImpl?: typeof fetch }): Promise<FeedItem[]>;
}
