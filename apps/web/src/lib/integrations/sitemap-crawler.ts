import * as xml2js from 'xml2js';

export class SitemapCrawler {
  private sitemapUrl: string;

  constructor(sitemapUrl: string) {
    this.sitemapUrl = sitemapUrl;
  }

  async crawl(): Promise<string[]> {
    try {
      const response = await fetch(this.sitemapUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch sitemap: ${response.statusText}`);
      }

      const xmlData = await response.text();
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(xmlData);

      const urls: string[] = [];

      // Handle standard <urlset> 
      if (result.urlset && result.urlset.url) {
        for (const urlEntry of result.urlset.url) {
          if (urlEntry.loc && urlEntry.loc[0]) {
            urls.push(urlEntry.loc[0]);
          }
        }
      } 
      // Handle <sitemapindex> for nested sitemaps
      else if (result.sitemapindex && result.sitemapindex.sitemap) {
        for (const sitemapEntry of result.sitemapindex.sitemap) {
          if (sitemapEntry.loc && sitemapEntry.loc[0]) {
            // Recursively fetch nested sitemap
            const nestedCrawler = new SitemapCrawler(sitemapEntry.loc[0]);
            const nestedUrls = await nestedCrawler.crawl();
            urls.push(...nestedUrls);
          }
        }
      }

      return Array.from(new Set(urls)); // Deduplicate
    } catch (error) {
      console.error(`Sitemap Crawler Error [${this.sitemapUrl}]:`, error);
      throw error;
    }
  }
}
