import { ScraperHealthClient } from "./scraper-health-client";

export const metadata = {
  title: "Scraper Health | CCaSS Intelligence",
  description: "Monitor scraper health and run history.",
};

export default function ScraperHealthPage() {
  return <ScraperHealthClient />;
}
